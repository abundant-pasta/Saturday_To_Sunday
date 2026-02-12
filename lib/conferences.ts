// lib/conferences.ts

// A cheat sheet to group colleges/countries by conference/region
const COLLEGE_MAP: Record<string, string> = {
  // --- FOOTBALL (BIG TEN) ---
  "Ohio State": "Big Ten", "Michigan": "Big Ten", "Penn State": "Big Ten",
  "Wisconsin": "Big Ten", "Iowa": "Big Ten", "Nebraska": "Big Ten",
  "Michigan State": "Big Ten", "Minnesota": "Big Ten", "Purdue": "Big Ten",
  "Illinois": "Big Ten", "Northwestern": "Big Ten", "Indiana": "Big Ten",
  "Rutgers": "Big Ten", "Maryland": "Big Ten", "USC": "Big Ten",
  "UCLA": "Big Ten", "Oregon": "Big Ten", "Washington": "Big Ten",

  // --- FOOTBALL (SEC) ---
  "Alabama": "SEC", "Georgia": "SEC", "LSU": "SEC", "Florida": "SEC",
  "Tennessee": "SEC", "Auburn": "SEC", "Texas A&M": "SEC", "Texas": "SEC",
  "Oklahoma": "SEC", "Ole Miss": "SEC", "Mississippi State": "SEC",
  "Arkansas": "SEC", "South Carolina": "SEC", "Kentucky": "SEC",
  "Missouri": "SEC", "Vanderbilt": "SEC",

  // --- FOOTBALL (ACC) ---
  "Clemson": "ACC", "Florida State": "ACC", "Miami (FL)": "ACC",
  "North Carolina": "ACC", "Duke": "ACC", "Virginia Tech": "ACC",
  "Virginia": "ACC", "Louisville": "ACC", "Georgia Tech": "ACC",
  "Pittsburgh": "ACC", "Syracuse": "ACC", "Boston College": "ACC",
  "NC State": "ACC", "Wake Forest": "ACC", "Stanford": "ACC", "California": "ACC",
  "SMU": "ACC",

  // --- FOOTBALL (BIG 12) ---
  "Kansas State": "Big 12", "Oklahoma State": "Big 12", "TCU": "Big 12",
  "Baylor": "Big 12", "Texas Tech": "Big 12", "West Virginia": "Big 12",
  "Iowa State": "Big 12", "Kansas": "Big 12", "Utah": "Big 12",
  "Colorado": "Big 12", "Arizona": "Big 12", "Arizona State": "Big 12",
  "BYU": "Big 12", "Cincinnati": "Big 12", "UCF": "Big 12", "Houston": "Big 12",

  // --- BASKETBALL (BIG EAST) ---
  "UConn": "Big East", "Marquette": "Big East", "Creighton": "Big East",
  "Villanova": "Big East", "Seton Hall": "Big East", "St. John's": "Big East",
  "Providence": "Big East", "Xavier": "Big East", "Butler": "Big East",
  "Georgetown": "Big East", "DePaul": "Big East",

  // --- BASKETBALL (WCC / MID-MAJOR POWERS) ---
  "Gonzaga": "WCC", "Saint Mary's": "WCC", "San Francisco": "WCC", "Santa Clara": "WCC",
  "San Diego State": "Mountain West", "UNLV": "Mountain West", "Nevada": "Mountain West",
  "New Mexico": "Mountain West", "Utah State": "Mountain West", "Boise State": "Mountain West",
  "Memphis": "AAC", "Dayton": "A10", "VCU": "A10", "Davidson": "A10",
  "Wichita State": "AAC", "Temple": "AAC",

  // --- BASKETBALL LEGENDS (SMALLER SCHOOLS) ---
  "Navy": "Legend-Small", "Weber State": "Legend-Small", "Lehigh": "Legend-Small",
  "Louisiana Tech": "Legend-Small", "Seattle": "Legend-Small",
  "Morehead State": "Legend-Small", "Grambling State": "Legend-Small", "Merced College": "Legend-Small",
  "Central Arkansas": "Legend-Small", "Detroit Mercy": "Legend-Small",

  // --- INTERNATIONAL (EUROPE - BALKANS) ---
  "Serbia": "Europe-Balkans", "Slovenia": "Europe-Balkans", "Croatia": "Europe-Balkans",
  "Montenegro": "Europe-Balkans", "Bosnia and Herzegovina": "Europe-Balkans",
  "North Macedonia": "Europe-Balkans",

  // --- INTERNATIONAL (EUROPE - WEST/CENTRAL) ---
  "France": "Europe-West", "Germany": "Europe-West", "Spain": "Europe-West",
  "Italy": "Europe-West", "Greece": "Europe-West", "Turkey": "Europe-West",
  "Lithuania": "Europe-West", "Latvia": "Europe-West", "Finland": "Europe-West",
  "Belgium": "Europe-West", "Poland": "Europe-West", "Ukraine": "Europe-West",

  // --- INTERNATIONAL (REST OF WORLD) ---
  "China": "World", "Japan": "World", "South Korea": "World", "Philippines": "World",
  "Australia": "World", "New Zealand": "World",
  "Cameroon": "World", "Nigeria": "World", "Senegal": "World", "South Sudan": "World",
  "Democratic Republic of the Congo": "World",
  "Canada": "World", "Brazil": "World", "Argentina": "World", "Bahamas": "World", "Puerto Rico": "World",

  // --- PREP TO PRO ---
  "High School": "Prep", "G-League Ignite": "Prep", "Overtime Elite": "Prep",
  "France (Metropolitans 92)": "Europe-West" // Wemby special case override if needed
}

export function getConference(school: string) {
  // Normalize string to handle slight variations if needed
  return COLLEGE_MAP[school] || "Other"
}

// Returns 3 random schools from the SAME conference/region
export function getSimilarDistractors(correctCollege: string, allPossibleColleges: string[]) {
  const region = getConference(correctCollege)

  // 1. Try to find entities in the same region/conference
  let pool = allPossibleColleges.filter(c =>
    c !== correctCollege && getConference(c) === region
  )

  // 2. Fallback Logic
  if (pool.length < 3) {
    if (region.startsWith("Europe")) {
      // If specific European region (e.g. Balkans) is too small, expand to ALL Europe
      pool = allPossibleColleges.filter(c => c !== correctCollege && getConference(c).startsWith("Europe"))
    } else if (region === "Prep") {
      // If Prep pool is small (unlikely if data is good), pull from "Legend-Small" as backup
      pool = allPossibleColleges.filter(c => c !== correctCollege && (getConference(c) === "Prep" || getConference(c) === "Legend-Small"))
    }

    // Ultimate fallback: Just random from the list (excluding the correct answer)
    if (pool.length < 3) {
      pool = allPossibleColleges.filter(c => c !== correctCollege)
    }
  }

  // 3. Shuffle and pick 3
  const shuffled = pool.sort(() => 0.5 - Math.random())
  return shuffled.slice(0, 3)
}