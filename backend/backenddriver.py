from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
from dotenv import load_dotenv
import traceback
import requests
from bs4 import BeautifulSoup
import re
from pymongo import MongoClient

# Load environment variables
load_dotenv("./.env.local")

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

# Set up Flask
app = Flask(__name__)
CORS(app)

# Set up MongoDB
MongoURI = os.getenv("MONGO_URI")
client = MongoClient(MongoURI)
db = client['test']
colors_collection = db['colors']

prompt = """You are Betty, Benjamin Moore's virtual color consultant. You help users choose paint colors based on room type, lighting, furniture, and mood.

Instructions:
- Keep responses conversational and friendly
- DO NOT use markdown formatting (**, *, etc.)
- Use clear, simple language
- Include specific color codes and hex values
- Focus on practical, actionable advice
- Format color information in blocks using the following format:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 [Color Name] ([Color Code])
Hex: #[Hex Value]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For color tips, follow this format:

Color Tips for [Color Name]:

• [Tip 1: Include room suggestion, complementary colors, and practical advice]
• [Tip 2: Include lighting considerations and style recommendations]
• [Tip 3: Include specific application tips and design ideas]

For trending colors, follow this format (show only 3 colors):

Trending Colors This Year:

1. Warm Neutrals:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 Shaker Beige (HC-45)
Hex: #D8C7B0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. Soft Muted Tones:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 Gray Owl (2137-60)
Hex: #D3D4CC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. Bold Accents:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 Hale Navy (HC-154)
Hex: #2D3142
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For each color, include:
- Color name and code
- Hex value
- Best use cases
- Complementary colors
- Style recommendations

Keep the tone friendly and conversational. Avoid technical jargon unless necessary. Focus on helping users understand how to use these colors in their homes.

IMPORTANT: 
1. Only use colors that exist on Benjamin Moore's website. You can reference any color from their official website.
2. When showing multiple colors, limit the response to 3 colors maximum.
3. If the user asks about a color that is not on Benjamin Moore's website, say that you don't know about that color.

"""

def generate_color_tips(color_name, color_code):
    try:
        tips_prompt = f"""Generate specific tips for using {color_name} ({color_code}) in interior design. For each tip, include:
1. A specific room or space where this color works well
2. Complementary colors that pair with this color
3. Practical application advice
4. Lighting considerations
5. Style recommendations

Format each tip as a simple sentence without any special characters, bullet points, or markdown formatting."""

        response = model.generate_content(tips_prompt)
        if not response or not response.text:
            return ["No tips available for this color."]

        # Clean up the response
        tips = response.text.split('\n')
        cleaned_tips = []
        for tip in tips:
            # Remove any markdown formatting
            tip = re.sub(r'[*_`]', '', tip)
            # Remove bullet points and numbers
            tip = re.sub(r'^[\d•\-\*\.\s]+', '', tip)
            # Remove any leading/trailing special characters
            tip = re.sub(r'^[^\w\s]+|[^\w\s]+$', '', tip)
            # Remove extra whitespace
            tip = ' '.join(tip.split())
            if tip and len(tip) > 10:  # Only include substantial tips
                cleaned_tips.append(tip)

        return cleaned_tips if cleaned_tips else ["No tips available for this color."]
    except Exception as e:
        print(f"Error generating tips: {str(e)}")
        return ["Error generating tips. Please try again."]

@app.route('/api/colorsense', methods=['POST'])
def colorsense_chat():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'message': 'No JSON data provided'}), 400
            
        user_message = data.get("message", "").strip()
        if not user_message:
            return jsonify({'message': 'No message provided'}), 400

        # Check if this is a color tips request
        if "Generate 3 specific tips for using" in user_message:
            # Extract color name and code from the message
            match = re.search(r'using (.*?) \((.*?)\)', user_message)
            if match:
                color_name = match.group(1)
                color_code = match.group(2)
                tips = generate_color_tips(color_name, color_code)
                if tips:
                    return jsonify({
                        "success": True,
                        "textOutput": "\n".join(tips)  # Join tips with newlines without bullet points
                    }), 200
                else:
                    return jsonify({
                        "success": False,
                        "message": "Failed to generate color tips"
                    }), 500
            else:
                return jsonify({
                    "success": False,
                    "message": "Could not extract color information from request"
                }), 400

        # Generate response using the AI model
        full_prompt = prompt + f"\n\nUser Request:\n{user_message}"
        response = model.generate_content(full_prompt)
        if not response or not response.text:
            return jsonify({'message': 'No response from AI model'}), 500
            
        output = response.text.strip()
        return jsonify({
            "success": True,
            "textOutput": output
        }), 200

    except Exception as e:
        print(f"Server Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': 'Internal server error. Please try again.'
        }), 500

@app.route('/api/colors', methods=['GET'])
def get_colors():
    try:
        # Get query parameters
        search_query = request.args.get('query', '').strip()
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 12))  # Show 12 colors per page
        
        # Build MongoDB query
        query = {}
        if search_query:
            # Search in name, code, and description fields
            query['$or'] = [
                {'name': {'$regex': search_query, '$options': 'i'}},
                {'code': {'$regex': search_query, '$options': 'i'}},
                {'description': {'$regex': search_query, '$options': 'i'}}
            ]
        
        
        # Calculate skip value for pagination
        skip = (page - 1) * per_page
        
        # Get total count for pagination
        total_colors = colors_collection.count_documents(query)
        
        # Get colors from MongoDB with all fields
        colors = list(colors_collection.find(
            query,
            {
                '_id': 0,
                'name': 1,
                'code': 1,
                'hex': 1,
                'family': 1,
                'collection': 1,
                'undertone': 1,
                'lrv': 1,
                'description': 1,
                'suggestedRooms': 1,
                'style': 1,
                'lighting': 1,
                'isTrending': 1,
                'yearIntroduced': 1,
                'complementaryColors': 1
            }
        ).skip(skip).limit(per_page))
        
        # Return empty array instead of error when no colors found
        return jsonify({
            'success': True,
            'colors': colors,
            'pagination': {
                'total': total_colors,
                'page': page,
                'per_page': per_page,
                'total_pages': (total_colors + per_page - 1) // per_page
            }
        }), 200
        
    except Exception as e:
        print(f"Error fetching colors: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': 'Error fetching colors from database'
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)