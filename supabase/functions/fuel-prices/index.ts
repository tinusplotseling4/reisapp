const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FuelType = "diesel" | "e5" | "e10";

type FuelStop = {
  label?: string;
  search?: string;
  lat?: number;
  lng?: number;
};

type TankerkoenigStation = {
  id: string;
  name?: string;
  brand?: string;
  street?: string;
  houseNumber?: string;
  postCode?: number;
  place?: string;
  lat?: number;
  lng?: number;
  dist?: number;
  isOpen?: boolean;
  price?: number;
  diesel?: number;
  e5?: number;
  e10?: number;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

function normalizeFuelType(type: unknown): FuelType {
  return type === "e5" || type === "e10" || type === "diesel" ? type : "diesel";
}

function isGermanCoordinate(stop: FuelStop) {
  if (typeof stop.lat !== "number" || typeof stop.lng !== "number") return false;
  return stop.lat >= 47.2 && stop.lat <= 55.2 && stop.lng >= 5.5 && stop.lng <= 15.5;
}

function stationMapsUrl(station: TankerkoenigStation) {
  if (typeof station.lat === "number" && typeof station.lng === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${station.lat},${station.lng}`;
  }

  const query = [station.name, station.street, station.houseNumber, station.place]
    .filter(Boolean)
    .join(" ");
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

function normalizeStation(station: TankerkoenigStation, fuelType: FuelType) {
  const price = station.price ?? station[fuelType];
  const address = [station.street, station.houseNumber, station.postCode, station.place]
    .filter(Boolean)
    .join(" ");

  return {
    id: station.id,
    name: station.name || station.brand || "Tankstation",
    brand: station.brand || "",
    address,
    place: station.place || "",
    lat: station.lat,
    lng: station.lng,
    price,
    distanceKm: typeof station.dist === "number" ? Number(station.dist.toFixed(1)) : null,
    isOpen: station.isOpen,
    mapsUrl: stationMapsUrl(station),
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const apiKey = Deno.env.get("TANKERKOENIG_API_KEY");
  if (!apiKey) {
    return jsonResponse({ error: "TANKERKOENIG_API_KEY ontbreekt in Supabase secrets." }, 500);
  }

  try {
    const payload = await request.json();
    const fuelType = normalizeFuelType(payload.fuelType);
    const stops = Array.isArray(payload.stops) ? (payload.stops as FuelStop[]) : [];
    const stop = stops.find(isGermanCoordinate);

    if (!stop) {
      return jsonResponse({
        stations: [],
        source: "Tankerkönig / MTS-K",
        message: "Live prijzen zijn nu alleen beschikbaar voor Duitse coördinaten.",
      });
    }

    const params = new URLSearchParams({
      lat: String(stop.lat),
      lng: String(stop.lng),
      rad: "15",
      sort: "price",
      type: fuelType,
      apikey: apiKey,
    });

    const upstream = await fetch(`https://creativecommons.tankerkoenig.de/json/list.php?${params}`);
    const data = await upstream.json();

    if (!upstream.ok || !data.ok) {
      return jsonResponse({ error: data.message || "Tankerkönig gaf geen bruikbaar antwoord." }, 502);
    }

    const stations = (data.stations || [])
      .map((station: TankerkoenigStation) => normalizeStation(station, fuelType))
      .filter((station: { price?: number }) => typeof station.price === "number")
      .sort((a: { price: number }, b: { price: number }) => a.price - b.price)
      .slice(0, 8);

    return jsonResponse({
      stations,
      source: "Tankerkönig / MTS-K",
      fuelType,
      radiusKm: 15,
      target: {
        label: stop.label || stop.search || "Duitse locatie",
        lat: stop.lat,
        lng: stop.lng,
      },
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Onbekende fout." }, 500);
  }
});
