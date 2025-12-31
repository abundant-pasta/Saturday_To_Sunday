// lib/conferences.ts

// A cheat sheet to group colleges by conference/similarity
const COLLEGE_MAP: Record<string, string> = {
  // BIG TEN
  "Ohio State": "Big Ten", "Michigan": "Big Ten", "Penn State": "Big Ten",
  "Wisconsin": "Big Ten", "Iowa": "Big Ten", "Nebraska": "Big Ten",
  "Michigan State": "Big Ten", "Minnesota": "Big Ten", "Purdue": "Big Ten",
  "Illinois": "Big Ten", "Northwestern": "Big Ten", "Indiana": "Big Ten",
  "Rutgers": "Big Ten", "Maryland": "Big Ten", "USC": "Big Ten",
  "UCLA": "Big Ten", "Oregon": "Big Ten", "Washington": "Big Ten",

  // SEC
  "Alabama": "SEC", "Georgia": "SEC", "LSU": "SEC", "Florida": "SEC",
  "Tennessee": "SEC", "Auburn": "SEC", "Texas A&M": "SEC", "Texas": "SEC",
  "Oklahoma": "SEC", "Ole Miss": "SEC", "Mississippi State": "SEC",
  "Arkansas": "SEC", "South Carolina": "SEC", "Kentucky": "SEC",
  "Missouri": "SEC", "Vanderbilt": "SEC",

  // ACC
  "Clemson": "ACC", "Florida State": "ACC", "Miami (FL)": "ACC",
  "North Carolina": "ACC", "Duke": "ACC", "Virginia Tech": "ACC",
  "Virginia": "ACC", "Louisville": "ACC", "Georgia Tech": "ACC",
  "Pittsburgh": "ACC", "Syracuse": "ACC", "Boston College": "ACC",
  "NC State": "ACC", "Wake Forest": "ACC", "Stanford": "ACC", "California": "ACC",

  // BIG 12
  "Kansas State": "Big 12", "Oklahoma State": "Big 12", "TCU": "Big 12",
  "Baylor": "Big 12", "Texas Tech": "Big 12", "West Virginia": "Big 12",
  "Iowa State": "Big 12", "Kansas": "Big 12", "Utah": "Big 12",
  "Colorado": "Big 12", "Arizona": "Big 12", "Arizona State": "Big 12",
  "BYU": "Big 12", "Cincinnati": "Big 12", "UCF": "Big 12", "Houston": "Big 12",

  // INDEPENDENT / OTHER NOTABLE
  "Notre Dame": "Indep", "Army": "Indep", "Navy": "Indep"
}

export function getConference(school: string) {
  return COLLEGE_MAP[school] || "Other"
}

// Returns 3 random schools from the SAME conference (or random others if not found)
export function getSimilarDistractors(correctCollege: string, allPossibleColleges: string[]) {
  const conference = getConference(correctCollege)
  
  // 1. Try to find schools in the same conference
  let pool = allPossibleColleges.filter(c => 
    c !== correctCollege && getConference(c) === conference
  )

  // 2. If pool is too small (e.g. "Other" or weird school), fall back to everyone
  if (pool.length < 3) {
    pool = allPossibleColleges.filter(c => c !== correctCollege)
  }

  // 3. Shuffle and pick 3
  const shuffled = pool.sort(() => 0.5 - Math.random())
  return shuffled.slice(0, 3)
}