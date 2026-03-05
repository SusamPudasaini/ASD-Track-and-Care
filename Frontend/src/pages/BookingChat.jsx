import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import Navbar from "../components/navbar/Navbar";
import api from "../api/axios";
   
export default function BookingChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingInfo, setBookingInfo] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const stompRef = useRef(null);
  const role = useMemo(() => {
    const raw = (localStorage.getItem("role") || "USER").toUpperCase().trim();
    return raw.startsWith("ROLE_") ? raw.replace("ROLE_", "") : raw;
  }, []);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";
  const wsBrokerUrl = useMemo(() => {
    const base = String(apiBaseUrl || "http://localhost:8081").replace(/\/$/, "");
    if (base.startsWith("https://")) return base.replace("https://", "wss://") + "/ws-chat";
    if (base.startsWith("http://")) return base.replace("http://", "ws://") + "/ws-chat";
    return `ws://${base}/ws-chat`;
  }, [apiBaseUrl]);

  const backPath = role === "THERAPIST" ? "/therapist/dashboard" : "/bookings";

  const fmtTime = (iso) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return "";
    }
  };

  useEffect(() => {
    let active = true;

    const loadBookingContext = async () => {
      try {
        const endpoint = role === "THERAPIST" ? "/api/bookings/therapist/me" : "/api/bookings/me";
        const res = await api.get(endpoint);
        const list = Array.isArray(res.data) ? res.data : [];
        const current = list.find((x) => String(x.id) === String(id));

        if (!active) return;
        if (!current) {
          setError("Booking not found for your account.");
          return;
        }

        setBookingInfo(current);
      } catch {
        if (!active) return;
        setError("Could not load booking details.");
      }
    };

    const loadMessages = async () => {
      try {
        const res = await api.get(`/api/bookings/${id}/chat/messages`);
        if (!active) return;
        setMessages(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      } catch (err) {
        if (!active) return;
        setLoading(false);
        setError(
          err?.response?.data?.message ||
            (typeof err?.response?.data === "string" ? err.response.data : "Chat is available only for your confirmed bookings.")
        );
      }
    };

    loadBookingContext();
    loadMessages();

    const token = localStorage.getItem("token");
    const client = new Client({
      brokerURL: wsBrokerUrl,
      reconnectDelay: 3000,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => {
        if (!active) return;
        setWsConnected(true);
        client.subscribe(`/user/queue/bookings/${id}`, (frame) => {
          try {
            const incoming = JSON.parse(frame.body);
            setMessages((prev) => {
              if (incoming?.id && prev.some((x) => x?.id === incoming.id)) return prev;
              return [...prev, incoming];
            });
          } catch {
            // ignore malformed frames
          }
        });
      },
      onWebSocketClose: () => {
        if (!active) return;
        setWsConnected(false);
      },
      onStompError: () => {
        if (!active) return;
        setWsConnected(false);
      },
    });
    client.activate();
    stompRef.current = client;

    return () => {
      active = false;
      if (stompRef.current) {
        stompRef.current.deactivate();
        stompRef.current = null;
      }
    };
  }, [id, role, wsBrokerUrl]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;

    try {
      if (stompRef.current && wsConnected) {
        stompRef.current.publish({
          destination: `/app/bookings/${id}/chat.send`,
          body: JSON.stringify({ message: body }),
        });
      } else {
        const res = await api.post(`/api/bookings/${id}/chat/messages`, { message: body });
        const msg = res.data;
        setMessages((prev) => [...prev, msg]);
      }

      setText("");
      setError("");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          (typeof err?.response?.data === "string" ? err.response.data : "Could not send message.")
      );
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Booking Chat #{id}</h1>
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back
          </button>
        </div>

        {bookingInfo && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            {role === "THERAPIST"
              ? `Chat with ${bookingInfo?.userName || "Parent"} for session ${bookingInfo?.date || "-"} ${bookingInfo?.time || ""}`
              : `Chat with ${bookingInfo?.therapistName || "Therapist"} for session ${bookingInfo?.date || "-"} ${bookingInfo?.time || ""}`}
            <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${wsConnected ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {wsConnected ? "Live" : "Reconnecting"}
            </div>
          </div>
        )}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading chat...</div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-[420px] space-y-3 overflow-y-auto p-4">
              {messages.map((m, i) => {
                const mine = String(m?.senderRole || "").toUpperCase() === role;
                return (
                <div key={`${m?.id || ""}-${m?.sentAt || ""}-${i}`} className={`rounded-lg px-3 py-2 ${mine ? "ml-10 bg-blue-50" : "mr-10 bg-slate-100"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-slate-600">{m?.senderName || "Participant"}</div>
                    <div className="text-[11px] text-slate-500">{fmtTime(m?.sentAt)}</div>
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{m?.message}</div>
                </div>
              )})}
              {messages.length === 0 && (
                <p className="text-sm text-slate-500">No messages yet. Start the conversation.</p>
              )}
            </div>

            <div className="border-t border-slate-200 p-4">
              <div className="flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Type a message"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={send}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
