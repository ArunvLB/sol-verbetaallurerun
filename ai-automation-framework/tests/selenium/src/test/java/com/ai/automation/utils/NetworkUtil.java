package com.ai.automation.utils;

import java.net.HttpURLConnection;
import java.net.URL;

public class NetworkUtil {
  private static final String PROBE_URL = "https://www.google.com/generate_204";

  public static boolean hasConnectivity() {
    try {
      HttpURLConnection conn = (HttpURLConnection) new URL(PROBE_URL).openConnection();
      conn.setConnectTimeout(3000);
      conn.setReadTimeout(3000);
      conn.setInstanceFollowRedirects(false);
      conn.connect();
      int code = conn.getResponseCode();
      return code == 204 || code == 200;
    } catch (Exception e) {
      return false;
    }
  }
}
