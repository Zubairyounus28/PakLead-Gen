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
      mapLink
    });
  });

  return businesses;
};

export const searchBusinessesWithGemini = async (
  term: string,
  location: string,
  geo?: GeoLocation,
  existingNames: string[] = []
): Promise<Business[]> => {
  
  const isLoadMore = existingNames.length > 0;

  // If loading more, strictly exclude previous names and ask to expand radius
  const excludeContext = isLoadMore 
    ? `The following businesses have already been listed, DO NOT include them again: ${existingNames.join(", ")}.` 
    : "";

  let locationContext = "";
  if (geo && location === "Near Me") {
     locationContext = `The user is located at Lat: ${geo.lat}, Lng: ${geo.lng}. Search around this coordinate.`;
  }

  const expansionInstruction = isLoadMore
    ? "Expand the search area to surrounding neighborhoods or a wider radius to find new results not listed above."
    : "";

  // Dynamic Prompt Construction based on location type
  let searchInstruction = `Search for "${term}" in "${location}" (Pakistan).`;
  
  // Detect "between X and Y" pattern for route searching
  if (location.toLowerCase().startsWith("between ")) {
    searchInstruction = `Search for "${term}" businesses located along the route or area ${location} (Pakistan). Focus on finding businesses situated geographically between the two points.`;
  }

  const prompt = `
    ${searchInstruction}
    ${locationContext}
    ${excludeContext}
    ${expansionInstruction}
    
    Strictly list 5 to 10 distinct local businesses found using Google Maps.
    
    IMPORTANT: You must format the output strictly as follows for my parser to work. 
    Do not use JSON blocks. Use this plain text template for each business:

    ###START_BUSINESS
    Name: <Business Name>
    Address: <Full Address>
    Phone: <Phone Number or N/A>
    Rating: <Rating ex: 4.5/5 or N/A>
    Website: <Website URL or N/A>
    Description: <Short 1 sentence description>
    ###END_BUSINESS

    Ensure accurate contact details where available from the map data.
  `;

  try {
    const config: any = {
      tools: [{ googleMaps: {} }],
      systemInstruction: "You are a lead generation assistant for Pakistan. You extract business details accurately using Google Maps.",
    };

    // If using 'Near Me' with coordinates, pass them to retrievalConfig
    if (geo && location.toLowerCase().includes("near me")) {
        config.toolConfig = {
            retrievalConfig: {
                latLng: {
                    latitude: geo.lat,
                    longitude: geo.lng
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