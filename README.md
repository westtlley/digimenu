# Base44 App


This app was created automatically by Base44.
It's a Vite+React app that communicates with the Base44 API.

## Running the app

```bash
npm install
npm run dev
```

## Building the app

```bash
npm run build
```

### Mapa de entrega em tempo real (estilo iFood, Google Maps)

No app do entregador, o rastreamento pode usar **Google Maps** com animação suave (interpolação + rotação da moto). Para ativar, defina no `.env`:

```
VITE_GOOGLE_MAPS_KEY=sua_chave_maps_javascript_api
```

Obtenha a chave em [Google Cloud Console](https://console.cloud.google.com/) → APIs e Serviços → Credenciais, e ative a **Maps JavaScript API**. Sem a chave, o app usa o mapa Leaflet (OpenStreetMap/CartoDB) normalmente.

---

For more information and support, please contact Base44 support at app@base44.com.