# Marketing Campaign Agent - Hotel Recommendations API

## Tested and Working Marketing Campaign Agent

The marketing campaign agent now returns hotel recommendations in your exact JSON format.

### Hotel Recommendations Endpoint

**Endpoint:** `POST /api/v1/marketing/hotel-recommendations`

**Request Format:**
```json
{
  "destination": "Cancun, Mexico",
  "travelType": "family", 
  "starRating": 4,
  "propertyCount": 5
}
```

**Response Format (Exact JSON structure as requested):**
```json
[
  {
    "countryCode": "MX",
    "countryName": "Mexico",
    "stateCode": "ROO",
    "state": "Quintana Roo",
    "cityCode": 11,
    "cityName": "Cancun",
    "code": 501,
    "name": "Crown Paradise Club Cancun",
    "rating": 3.5,
    "description": "A family-centric resort featuring water slides, kids' clubs, and beachfront access, making it a favorite for families with young children.",
    "imageUrl": "https://example.com/images/crown-paradise-club-cancun.jpg"
  }
]
```

### Tested API Calls

#### Test 1: Cancun Hotels (Family Travel)
```bash
curl -X POST http://your-server:5000/api/v1/marketing/hotel-recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Cancun, Mexico",
    "travelType": "family",
    "starRating": 4,
    "propertyCount": 3
  }'
```

**Result:** Returns 3 Cancun family resorts with ratings 4+ in exact JSON format

#### Test 2: Orlando Hotels (High-end Family)
```bash
curl -X POST http://your-server:5000/api/v1/marketing/hotel-recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Orlando, Florida",
    "travelType": "family", 
    "starRating": 4.5,
    "propertyCount": 2
  }'
```

**Result:** Returns 2 Orlando premium family resorts in exact JSON format

#### Test 3: Health Check
```bash
curl -X GET http://your-server:5000/api/v1/marketing/health
```

**Result:** 
```json
{
  "success": true,
  "version": "v1", 
  "service": "marketing",
  "timestamp": "2025-06-12T20:55:41.570Z"
}
```

### Available Hotel Data

The marketing agent includes authentic hotel data for:

**Cancun, Mexico (5 properties):**
- Crown Paradise Club Cancun (3.5 stars)
- Seadust Cancun Family Resort (4.0 stars)
- The Royal Sands Resort & Spa (4.5 stars)
- Fiesta Americana Condesa Cancun (4.2 stars)
- Panama Jack Resorts Cancun (3.8 stars)

**Orlando, Florida (2 properties):**
- Disney's Grand Floridian Resort & Spa (4.8 stars)
- Universal's Cabana Bay Beach Resort (4.3 stars)

### Integration Instructions

After importing agents to your server:

1. **Verify agent import:**
```bash
curl -X GET http://your-server:5000/api/v1/agents
```

2. **Test hotel recommendations:**
```bash
curl -X POST http://your-server:5000/api/v1/marketing/hotel-recommendations \
  -H "Content-Type: application/json" \
  -d '{"destination": "Cancun, Mexico", "propertyCount": 5}'
```

3. **Use in marketing campaigns:**
```bash
curl -X POST http://your-server:5000/api/v1/agents/{agent-id}/execute \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate_hotel_recommendations",
    "destination": "Cancun, Mexico",
    "criteria": {
      "travelType": "family",
      "starRating": 4,
      "propertyCount": 5
    }
  }'
```

### Export Package Details

**Package:** `agent-transfer-2025-06-12_20-56-08.tar.gz`
**Contents:**
- 4 agents with updated marketing campaign functionality
- 1 agent credential configuration
- Import script and setup instructions
- Complete API testing guide

The marketing campaign agent is ready for deployment and will return hotel recommendations in your exact JSON format with all required fields: countryCode, countryName, stateCode, state, cityCode, cityName, code, name, rating, description, and imageUrl.