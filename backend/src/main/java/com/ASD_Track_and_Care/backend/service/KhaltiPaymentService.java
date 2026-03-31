package com.ASD_Track_and_Care.backend.service;

import com.ASD_Track_and_Care.backend.config.KhaltiProperties;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class KhaltiPaymentService {

    private final RestTemplate restTemplate;
    private final KhaltiProperties khaltiProperties;

    public KhaltiPaymentService(RestTemplate restTemplate, KhaltiProperties khaltiProperties) {
        this.restTemplate = restTemplate;
        this.khaltiProperties = khaltiProperties;
    }

    public Map<String, Object> initiatePayment(
            Integer amountInPaisa,
            String purchaseOrderId,
            String purchaseOrderName,
            String customerName,
            String customerEmail,
            String customerPhone
    ) {
        String url = khaltiProperties.getBaseUrl() + "/epayment/initiate/";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Key " + khaltiProperties.getSecretKey());

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("return_url", khaltiProperties.getReturnUrl());
        payload.put("website_url", khaltiProperties.getWebsiteUrl());
        payload.put("amount", amountInPaisa);
        payload.put("purchase_order_id", purchaseOrderId);
        payload.put("purchase_order_name", purchaseOrderName);

        Map<String, Object> customerInfo = new LinkedHashMap<>();
        customerInfo.put("name", customerName == null || customerName.isBlank() ? "Customer" : customerName);
        customerInfo.put("email", customerEmail == null ? "" : customerEmail);
        customerInfo.put("phone", customerPhone == null ? "" : customerPhone);

        payload.put("customer_info", customerInfo);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

        ResponseEntity<Map> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                Map.class
        );

        return response.getBody();
    }

    public Map<String, Object> lookupPayment(String pidx) {
        String url = khaltiProperties.getBaseUrl() + "/epayment/lookup/";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Key " + khaltiProperties.getSecretKey());

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("pidx", pidx);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

        ResponseEntity<Map> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                Map.class
        );

        return response.getBody();
    }
}