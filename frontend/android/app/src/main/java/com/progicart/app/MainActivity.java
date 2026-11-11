package com.progicart.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class MainActivity extends BridgeActivity {

    private static final Set<String> UPI_PAYMENT_SCHEMES = new HashSet<>(
        Arrays.asList("upi", "tez", "phonepe", "paytmmp", "bhim", "credpay", "mobikwik", "freecharge")
    );

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().setWebViewClient(new BridgeWebViewClient(this.bridge) {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    Uri uri = request.getUrl();
                    String url = uri != null ? uri.toString() : "";
                    String scheme = uri != null && uri.getScheme() != null ? uri.getScheme().toLowerCase() : "";

                    if ("intent".equals(scheme)) {
                        try {
                            Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                            if (intent != null) {
                                startActivity(intent);
                                return true;
                            }
                        } catch (Exception ignored) {
                            return true;
                        }
                    }

                    if (UPI_PAYMENT_SCHEMES.contains(scheme)) {
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                            startActivity(intent);
                        } catch (ActivityNotFoundException ignored) {
                            // Gracefully ignore when a specific UPI app isn't installed
                        }
                        return true;
                    }

                    return super.shouldOverrideUrlLoading(view, request);
                }
            });
        }
    }
}
