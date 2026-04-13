	package com.ASD_Track_and_Care.backend.config;

import com.ASD_Track_and_Care.backend.security.JwtChannelInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketChatConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtChannelInterceptor jwtChannelInterceptor;

    public WebSocketChatConfig(JwtChannelInterceptor jwtChannelInterceptor) {
        this.jwtChannelInterceptor = jwtChannelInterceptor;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws-chat")
            .setAllowedOriginPatterns(
                "http://localhost:*",
                "http://127.0.0.1:*",
                "http://213.145.86.157:5173",
                "http://213.145.86.157:5173/",
                "http://213.145.86.157:8081",
                "http://213.145.86.157:8081/",
                "https://kaley-vellicative-lucca.ngrok-free.dev:*"
            );

        registry.addEndpoint("/ws-chat-sockjs")
                .setAllowedOriginPatterns(
                        "http://localhost:*",
                        "http://127.0.0.1:*",
                    "http://213.145.86.157:5173",
                    "http://213.145.86.157:5173/",
                    "http://213.145.86.157:8081",
                    "http://213.145.86.157:8081/",
                        "https://kaley-vellicative-lucca.ngrok-free.dev:*"
                )
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(jwtChannelInterceptor);
    }
}
