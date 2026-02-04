const notificationSound =
  typeof Audio !== "undefined"
    ? new Audio("/Sonnerie.mp3")
    : null;
