import { GoogleGenAI } from "@google/genai";
import { Business, GeoLocation } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-2.5-flash";

/**
 * Parses the unstructured text response from Gemini into structured Business objects.
 */
const parseBusinessText = (text: string): Business[] => {
  const businesses: Business[] = [];
  const blocks = text.split("###START_BUSINESS");

  blocks.forEach((block, index) => {
    if (!block.trim() || !block.includes("###END_BUSINESS")) return;

    const content = block.split("###END_BUSINESS")[0];
    
    const extract = (key: string) => {
      const match = content.match(new RegExp(`${key}:\\s*(.*)`, "i"));
      return match ? match[1].trim() : "N/A";
    };

    const name = extract("Name");
    // Basic deduplication check or empty check
    if (!name || name === "N/A") return;

    const address = extract("Address");

    // Extract coordinates if available
    const latStr = extract("Latitude");
    const lngStr = extract("Longitude");
    const lat = latStr !== "N/A" ? parseFloat(latStr) : undefined;
    const lng = lngStr !== "N/A" ? parseFloat(lngStr) : undefined;

    // Construct a reliable search link
    let mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + " " + address)}`;
    
    businesses.push({
      id: `biz-${Date.now()}-${index}-${Math.random().toString(36).substring(7)}`,
      name: name.replace(/\*\*/g, ""), // Remove markdown bold if present
      address: address,
      phone: extract("Phone"),
      rating: extract("Rating"),
      website: extract("Website"),
      description: extract("Description"),
      mapLink,
      lat,
      lng
    });
  });

  return businesses;
};

export const searchBusinessesWithGemini = async (
  term: string,
  location: string,
  geo?: GeoLocation,
  existingNames: string[] = [],
  searchCoordinates?: GeoLocation
): Promise<Business[]> => {
  
  const isLoadMore = existingNames.length > 0;

  // If loading more, strictly exclude previous names and ask to expand radius
  const excludeContext = isLoadMore 
    ? `The following businesses have already been listed, DO NOT include them again: ${existingNames.join(", ")}.` 
    : "";

  let locationContext = "";
  let retrievalLat: number | undefined;
  let retrievalLng: number | undefined;

  // Priority 1: Explicit Search Coordinates (from Map Search)
  if (searchCoordinates) {
    locationContext = `FOCUS SEARCH AROUND COORDINATES: Lat ${searchCoordinates.lat}, Lng ${searchCoordinates.lng}.`;
    retrievalLat = searchCoordinates.lat;
    retrievalLng = searchCoordinates.lng;
  } 
  // Priority 2: User GPS "Near Me"
  else if (geo && location === "Near Me") {
     locationContext = `The user is located at Lat: ${geo.lat}, Lng: ${geo.lng}. Search around this coordinate.`;
     retrievalLat = geo.lat;
     retrievalLng = geo.lng;
  }

  const expansionInstruction = isLoadMore
    ? "Expand the search area slightly to find new results not listed above."
    : "";

  const prompt = `
    Search for "${term}" in "${location}" (Pakistan).
    ${locationContext}
    ${excludeContext}
    ${expansionInstruction}
    
    Strictly list as many distinct local businesses as possible (aim for 100) found using Google Maps.
    If the location is specific (like a colony or block), prioritize businesses exactly in that area.
    
    IMPORTANT: You must format the output strictly as follows for my parser to work. 
    Do not use JSON blocks. Use this plain text template for each business:

    ###START_BUSINESS
    Name: <Business Name>
    Address: <Full Address>
    Phone: <Phone Number or N/A>
    Rating: <Rating ex: 4.5/5 or N/A>
    Website: <Website URL or N/A>
    Description: <Short 1 sentence description>
    Latitude: <Decimal Latitude or N/A>
    Longitude: <Decimal Longitude or N/A>
    ###END_BUSINESS

    Ensure accurate contact details and coordinates where available from the map data.
  `;

  try {
    const config: any = {
      tools: [{ googleMaps: {} }],
      systemInstruction: "You are a lead generation assistant for Pakistan. You extract business details and coordinates accurately using Google Maps.",
    };

    // Apply retrieval config if we have coordinates (either from Map Center or GPS)
    if (retrievalLat !== undefined && retrievalLng !== undefined) {
        config.toolConfig = {
            retrievalConfig: {
                latLng: {
                    latitude: retrievalLat,
                    longitude: retrievalLng
                }
            }
        };
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: config
    });

    const text = response.text || "";
    return parseBusinessText(text);

  } catch (error) {
    console.error("Gemini Search Error:", error);
    throw error;
  }
};