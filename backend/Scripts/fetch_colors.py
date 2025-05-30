import os
import asyncio
import aiohttp
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB connection
client = MongoClient(os.getenv('MONGODB_URI'))
db = client['test']  
colors_collection = db['colors']

def get_color_family(hex_color):
    # Remove # if present
    hex_color = hex_color.replace("#", "")

    # Convert hex to RGB
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)

    # Calculate HSL
    max_val = max(r, g, b)
    min_val = min(r, g, b)
    l = (max_val + min_val) / 2

    if max_val == min_val:
        return "Gray"

    s = l > 0.5 and (max_val - min_val) / (2 - max_val - min_val) or (max_val - min_val) / (max_val + min_val)
    
    if max_val == r:
        h = (g - b) / (max_val - min_val)
    elif max_val == g:
        h = 2 + (b - r) / (max_val - min_val)
    else:
        h = 4 + (r - g) / (max_val - min_val)

    # Convert hue to degrees
    hue = h * 60

    # Determine color family based on hue
    if l > 0.9: return "White"
    if l < 0.2: return "Gray"
    if s < 0.1: return "Neutral"

    if 0 <= hue < 30: return "Red"
    if 30 <= hue < 60: return "Orange"
    if 60 <= hue < 90: return "Yellow"
    if 90 <= hue < 150: return "Green"
    if 150 <= hue < 210: return "Blue"
    if 210 <= hue < 270: return "Purple"
    if 270 <= hue < 330: return "Red"
    return "Red"

def get_undertone(family, hex_color):
    hex_color = hex_color.replace("#", "")
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)

    # Calculate warmth
    warmth = (r - b) / 255

    if family in ["White", "Gray", "Neutral"]:
        if warmth > 0.1: return "Warm"
        if warmth < -0.1: return "Cool"
        return "Neutral"

    return "Warm" if warmth > 0 else "Cool"

def calculate_lrv(hex_color):
    hex_color = hex_color.replace("#", "")
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)

    # Convert to relative luminance
    luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

    # Convert to LRV (0-100)
    return round(luminance * 100)

def get_suggested_rooms(family, lrv):
    rooms = []
    if lrv > 70:
        rooms.extend(["Living Room", "Kitchen", "Bathroom"])
    elif lrv > 50:
        rooms.extend(["Living Room", "Bedroom", "Dining Room"])
    elif lrv > 30:
        rooms.extend(["Bedroom", "Dining Room", "Home Office"])
    else:
        rooms.extend(["Bedroom", "Dining Room", "Accent Wall"])
    return rooms

def get_complementary_colors(hex_color):
    hex_color = hex_color.replace("#", "")
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)

    # Calculate complementary color
    comp_r = 255 - r
    comp_g = 255 - g
    comp_b = 255 - b

    # Convert back to hex
    comp_hex = f"#{comp_r:02x}{comp_g:02x}{comp_b:02x}"
    return [comp_hex]

def get_style(family, lrv):
    if lrv > 80: return "Minimalist"
    if lrv > 60: return "Modern"
    if lrv > 40: return "Contemporary"
    return "Traditional"

async def fetch_colors():
    try:
        # Define all color families to search for
        color_families = [
            "white", "neutral", "gray", "yellow", "orange", "red", "purple", "blue", "green",
            "beige", "cream", "tan", "brown", "black", "pink", "mint", "teal", "navy", "burgundy",
            "sage", "olive", "gold", "silver", "bronze", "copper", "ivory", "pearl", "coral",
            "lavender", "mauve", "maroon", "mustard", "khaki", "taupe", "charcoal", "slate",
            "indigo", "turquoise", "aqua", "crimson", "magenta", "fuchsia", "amber", "cobalt",
            "emerald", "ruby", "sapphire", "plum", "lilac", "periwinkle", "ochre", "putty",
            "storm", "linen", "smoke", "clay", "dove", "flax", "mulberry", "truffle", "espresso",
            "cinnamon", "mocha", "blush", "sky", "ash", "greige", "seashell", "stone", "cloud",
            "canvas", "wheat", "sand", "fog", "ink", "pine", "spruce", "willow", "cactus",
            "desert", "sunset", "twilight", "midnight", "alabaster", "arctic", "bay", "birch",
            "breeze", "brick", "canary", "carmine", "celery", "celeste", "champagne", "chestnut",
            "clover", "coal", "currant", "dandelion", "driftwood", "ebony", "eggshell", "fern",
            "flamingo", "garnet", "ginger", "glacier", "graphite", "harvest", "hazel", "honey",
            "ivory lace", "jade", "linen white", "lotus", "mallow", "maple", "marigold", "melon",
            "midnight blue", "mist", "mulch", "nectarine", "oatmeal", "opal", "orchid", "papaya",
            "peach", "pineapple", "raindrop", "raspberry", "rose", "seafoam", "sepia", "shell",
            "snow", "spring", "stone blue", "straw", "sunflower", "thistle", "toffee", "topaz",
            "truffle", "vanilla", "wisteria", "zinc"
        ]

        all_colors = []
        print("🔍 Starting to fetch colors for all families...")

        headers = {
            "Content-Type": "application/json;charset=UTF-8",
            "Ocp-Apim-Subscription-Key": "48c3c3e75b424f97904f9659da65b4d0",
            "Origin": "https://www.benjaminmoore.com",
            "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36"
        }

        async with aiohttp.ClientSession() as session:
            for family in color_families:
                print(f"\n📥 Fetching colors for family: {family}")
                data = {
                    "query": family,
                    "facets": []
                }

                try:
                    async with session.post(
                        "https://api.benjaminmoore.io/service/advancedSearch?version=v1.0",
                        json=data,
                        headers=headers
                    ) as response:
                        response_data = await response.json()
                        colors = [
                            c for c in response_data.get('data', {}).get('records', {}).get('page', [])
                            if c.get('color_name') and c.get('color_hex')
                        ]
                        print(f"✅ Found {len(colors)} colors for {family}")
                        all_colors.extend(colors)

                except Exception as error:
                    print(f"❌ Error fetching colors for {family}: {str(error)}")
                    continue

                # Add a small delay between requests
                await asyncio.sleep(1)

        # Remove duplicates based on color code
        unique_colors = {c['color_number']: c for c in all_colors}.values()
        print(f"\n🎨 Total unique colors found: {len(unique_colors)}")

        # Process and save each unique color
        for index, c in enumerate(unique_colors):
            print(f"\n👉 Processing color #{index + 1}: {c['color_name']}")

            hex_color = f"#{c['color_hex']}"
            family = get_color_family(hex_color)
            undertone = get_undertone(family, hex_color)
            lrv = calculate_lrv(hex_color)
            suggested_rooms = get_suggested_rooms(family, lrv)
            complementary_colors = get_complementary_colors(hex_color)
            style = get_style(family, lrv)

            color_doc = {
                "name": c['color_name'],
                "code": c['color_number'],
                "hex": hex_color,
                "family": family,
                "collection": "Classic",
                "undertone": undertone,
                "lrv": lrv,
                "description": f"A beautiful {undertone.lower()} {family.lower()} color perfect for {suggested_rooms[0].lower()} settings.",
                "suggestedRooms": suggested_rooms,
                "style": style,
                "lighting": "All",
                "yearIntroduced": 2024,
                "complementaryColors": complementary_colors,
                "isTrending": False
            }

            try:
                colors_collection.insert_one(color_doc)
                print(f"✅ Saved: {color_doc['name']}")
            except Exception as err:
                print(f"❌ Failed to save {c['color_name']}: {str(err)}")

        print("\n🎉 All valid colors saved to MongoDB!")
        client.close()

    except Exception as error:
        print(f"❌ Error in main process: {str(error)}")
        client.close()

if __name__ == "__main__": 
    asyncio.run(fetch_colors()) 