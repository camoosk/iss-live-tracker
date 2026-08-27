# ISS Live Tracker

A browser-based real-time 3D visualization of the International Space Station orbiting Earth, with live telemetry, user location comparison, and Indonesian/English support.

## Features

- 🌍 Interactive 3D Earth with orbit visualization
- 🛰️ Live ISS latitude, longitude, altitude, velocity, visibility, and footprint
- 📍 Automatic browser geolocation with manual latitude/longitude input
- 📏 Approximate 3D distance from the selected user location to the ISS
- 🇮🇩 Bahasa Indonesia / 🇬🇧 English interface
- 📱 Responsive desktop and mobile layout
- 🔒 User location is processed in the browser and is not sent to this project

## Data Sources

ISS telemetry is retrieved from the public **Where The ISS At?** API. The application uses NORAD catalog ID `25544` for the International Space Station.

The 3D scene uses Three.js loaded from a public CDN. The Earth texture is loaded from the Three.js example texture library.

## Running Locally

This is a static web application. Serve the repository with any local HTTP server, then open `index.html` through that server. Browser geolocation generally requires a secure context such as HTTPS or localhost.

## GitHub Pages

The repository is structured for static hosting and can be published directly with GitHub Pages using the `main` branch and repository root as the source.

## Project Status

🚀 Core 3D tracker foundation implemented.

Planned next steps include richer orbital history, ISS pass predictions over the selected location, improved Earth rendering, and additional telemetry panels.

## License

License to be determined.
