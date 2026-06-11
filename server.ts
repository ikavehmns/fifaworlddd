import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { initialMatches, initialGroups } from './src/data/worldCupData';
import { Match, UserPrediction, LeaderboardUser, UserProfileData, MatchEvent, GroupStandings } from './src/types';
import fs from 'fs';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin with the correct named database ID
const firebaseConfigRaw = fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8');
const firebaseConfig = JSON.parse(firebaseConfigRaw);

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = getFirestore(firebaseConfig.firestoreDatabaseId);

// Gemini Init with safety checks
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// REST Server Setup
const app = express();
app.use(express.json());

// Seeding function called on initialization to bootstrap Firestore
async function seedDatabaseIfEmpty() {
  try {
    const matchesSnap = await db.collection('matches').get();
    if (matchesSnap.empty) {
      console.log('Seeding initial matches...');
      for (const m of initialMatches) {
        await db.collection('matches').doc(m.id).set(m);
      }
    }

    const groupsSnap = await db.collection('groups').get();
    if (groupsSnap.empty) {
      console.log('Seeding initial groups...');
      for (const g of initialGroups) {
        await db.collection('groups').doc(g.groupName).set(g);
      }
    }

    const usersSnap = await db.collection('users').get();
    if (usersSnap.empty) {
      console.log('Seeding initial user table...');
      const demoUser: UserProfileData = {
        uid: 'demo-user',
        email: 'ikavehmash@gmail.com',
        displayName: 'ikavehmash',
        isPremium: false,
        points: 15,
        predictionsCount: 3,
      };
      await db.collection('users').doc('demo-user').set(demoUser);

      const seedPredictions = [
        {
          id: 'p1',
          userId: 'demo-user',
          matchId: 'm1',
          homeScore: 2,
          awayScore: 1,
          status: 'correct',
          pointsEarned: 3,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'p2',
          userId: 'demo-user',
          matchId: 'm2',
          homeScore: 1,
          awayScore: 1,
          status: 'correct',
          pointsEarned: 3,
          createdAt: new Date(Date.now() - 43200000).toISOString(),
        },
        {
          id: 'p3',
          userId: 'demo-user',
          matchId: 'm4',
          homeScore: 3,
          awayScore: 1,
          status: 'pending',
          createdAt: new Date().toISOString(),
        }
      ];
      for (const p of seedPredictions) {
        await db.collection('predictions').doc(p.id).set(p);
      }
    }
    console.log('Firestore seed verification finished successfully!');
  } catch (error) {
    console.error('Failed verifying seed databases: ', error);
  }
}

// Simulation of Active Live Matches
// Ticks every 12 seconds instead of minutes to make the live visual exciting and dynamic in preview!
setInterval(async () => {
  try {
    const matchesSnap = await db.collection('matches').get();
    const matchesList: Match[] = [];
    matchesSnap.forEach(snap => {
      matchesList.push(snap.data() as Match);
    });

    const liveMatch = matchesList.find(m => m.status === 'live');
    if (!liveMatch) return;

    // Increment minute
    liveMatch.minute += 1;

    // Get active lineup players for realistic event generator
    const homeLineup = liveMatch.lineups?.home.starting.map(p => p.name) || ['Pulisic', 'Weah', 'McKennie'];
    const awayLineup = liveMatch.lineups?.away.starting.map(p => p.name) || ['Moore', 'Davies', 'Ramsey'];

    const rand = Math.random();

    let targetTeam: 'home' | 'away' = Math.random() > 0.6 ? 'home' : 'away';
    let shooter = targetTeam === 'home' 
      ? homeLineup[Math.floor(Math.random() * homeLineup.length)] 
      : awayLineup[Math.floor(Math.random() * awayLineup.length)];

    const newEvent: Partial<MatchEvent> = {
      id: `ev-${Date.now()}`,
      minute: liveMatch.minute,
      teamId: targetTeam === 'home' ? liveMatch.homeTeam.id : liveMatch.awayTeam.id,
    };

    if (rand < 0.04) {
      // Goal!
      newEvent.type = 'goal';
      newEvent.player = shooter;
      newEvent.detail = Math.random() > 0.7 ? 'Stunning Long-range Shot' : 'Header from superb cross';
      
      if (targetTeam === 'home') {
        liveMatch.homeScore += 1;
      } else {
        liveMatch.awayScore += 1;
      }
      liveMatch.events.push(newEvent as MatchEvent);
    } else if (rand >= 0.04 && rand < 0.08) {
      // Yellow Card
      newEvent.type = 'yellow_card';
      newEvent.player = shooter;
      newEvent.detail = 'Rough tactical tackle';
      liveMatch.events.push(newEvent as MatchEvent);
    } else if (rand >= 0.08 && rand < 0.09) {
      // Red Card
      newEvent.type = 'red_card';
      newEvent.player = shooter;
      newEvent.detail = 'Dangerous tackle - straight red card';
      liveMatch.events.push(newEvent as MatchEvent);
    } else if (rand >= 0.09 && rand < 0.12) {
      // Substitution
      newEvent.type = 'substitution';
      newEvent.player = targetTeam === 'home' ? 'Brenden Aaronson' : 'David Brooks';
      newEvent.detail = `Replacing ${shooter}`;
      liveMatch.events.push(newEvent as MatchEvent);
    }

    // Handle Full-time
    if (liveMatch.minute >= 90) {
      liveMatch.status = 'finished';
      liveMatch.events.push({
        id: `ev-ft-${Date.now()}`,
        type: 'fulltime',
        minute: 90,
        player: 'Referee',
        teamId: '',
        detail: 'Final Whistle'
      });

      // Award Standings Points to Groups
      const homeId = liveMatch.homeTeam.id;
      const awayId = liveMatch.awayTeam.id;
      const homeScore = liveMatch.homeScore;
      const awayScore = liveMatch.awayScore;

      const groupsSnap = await db.collection('groups').get();
      for (const gDoc of groupsSnap.docs) {
        const g = gDoc.data() as GroupStandings;
        const hStanding = g.standings.find((s: any) => s.teamId === homeId);
        const aStanding = g.standings.find((s: any) => s.teamId === awayId);
        if (hStanding && aStanding) {
          hStanding.played += 1;
          aStanding.played += 1;
          hStanding.gf += homeScore;
          hStanding.ga += awayScore;
          hStanding.gd = hStanding.gf - hStanding.ga;
          aStanding.gf += awayScore;
          aStanding.ga += homeScore;
          aStanding.gd = aStanding.gf - aStanding.ga;

          if (homeScore > awayScore) {
            hStanding.won += 1;
            hStanding.points += 3;
            aStanding.lost += 1;
          } else if (homeScore < awayScore) {
            aStanding.won += 1;
            aStanding.points += 3;
            hStanding.lost += 1;
          } else {
            hStanding.drawn += 1;
            hStanding.points += 1;
            aStanding.drawn += 1;
            aStanding.points += 1;
          }
          
          g.standings.sort((x: any, y: any) => y.points - x.points || y.gd - x.gd || y.gf - x.gf);
          await db.collection('groups').doc(g.groupName).set(g);
        }
      }

      // Resolve predictions
      const predictionsSnap = await db.collection('predictions').get();
      for (const pDoc of predictionsSnap.docs) {
        const pred = pDoc.data() as UserPrediction;
        if (pred.matchId === liveMatch.id && pred.status === 'pending') {
          const isExact = pred.homeScore === liveMatch.homeScore && pred.awayScore === liveMatch.awayScore;
          const predDiff = pred.homeScore - pred.awayScore;
          const actualDiff = liveMatch.homeScore - liveMatch.awayScore;
          const isOutcome = (predDiff > 0 && actualDiff > 0) || (predDiff < 0 && actualDiff < 0) || (predDiff === 0 && actualDiff === 0);

          if (isExact) {
            pred.status = 'correct';
            pred.pointsEarned = 3;
          } else if (isOutcome) {
            pred.status = 'correct';
            pred.pointsEarned = 1;
          } else {
            pred.status = 'incorrect';
            pred.pointsEarned = 0;
          }

          await db.collection('predictions').doc(pred.id).set(pred);

          // Add points to User
          const userRef = db.collection('users').doc(pred.userId);
          const userSnap = await userRef.get();
          if (userSnap.exists) {
            const user = userSnap.data() as UserProfileData;
            user.points += pred.pointsEarned;
            await userRef.set(user);
          }
        }
      }
    }

    // Always persist match back
    await db.collection('matches').doc(liveMatch.id).set(liveMatch);

  } catch (error) {
    console.error('Match ticking interval simulation failed: ', error);
  }
}, 12050);

// API Route: Get all matches & current standings from Firestore
app.get('/api/matches', async (req, res) => {
  try {
    const matchesSnap = await db.collection('matches').get();
    const matchesList: Match[] = [];
    matchesSnap.forEach(snap => {
      matchesList.push(snap.data() as Match);
    });

    const groupsSnap = await db.collection('groups').get();
    const groupsList: GroupStandings[] = [];
    groupsSnap.forEach(snap => {
      groupsList.push(snap.data() as GroupStandings);
    });

    matchesList.sort((a, b) => a.id.localeCompare(b.id));
    groupsList.sort((a, b) => a.groupName.localeCompare(b.groupName));

    res.json({ matches: matchesList, groups: groupsList });
  } catch (error) {
    console.error('Error fetching matches from Firestore: ', error);
    res.status(500).json({ error: 'Firestore fetch failure' });
  }
});

// API Route: Login mock (Session creation)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, displayName, uid } = req.body;
    const userUid = uid || 'demo-user';
    
    const userRef = db.collection('users').doc(userUid);
    const userSnap = await userRef.get();
    let userProfile: UserProfileData;

    if (!userSnap.exists) {
      userProfile = {
        uid: userUid,
        email: email || 'user@example.com',
        displayName: displayName || email?.split('@')[0] || 'Fan2026',
        isPremium: false,
        points: 15, // Let's give them 15 starter points
        predictionsCount: 3,
      };
      await userRef.set(userProfile);
    } else {
      userProfile = userSnap.data() as UserProfileData;
    }

    res.json({ success: true, user: userProfile });
  } catch (error) {
    console.error('Error during Login auth: ', error);
    res.status(500).json({ error: 'Auth login error' });
  }
});

// API Route: Google-Sign-In sync and check
app.post('/api/auth/google', async (req, res) => {
  try {
    const { email, displayName, uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: 'UID is required' });
    }

    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    let userProfile: UserProfileData;

    if (!userSnap.exists) {
      userProfile = {
        uid,
        email,
        displayName: displayName || email.split('@')[0] || 'WorldCupGuru',
        isPremium: false,
        points: 0,
        predictionsCount: 0
      };
      await userRef.set(userProfile);
    } else {
      userProfile = userSnap.data() as UserProfileData;
    }

    res.json({ success: true, user: userProfile });
  } catch (error) {
    console.error('Error during Google SSO authentication: ', error);
    res.status(500).json({ error: 'Google SSO Error' });
  }
});

// API Route: Get User profile state and rank
app.get('/api/profile/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userSnap.data() as UserProfileData;

    const usersSnap = await db.collection('users').get();
    const allUsers: UserProfileData[] = [];
    usersSnap.forEach(snap => {
      allUsers.push(snap.data() as UserProfileData);
    });

    allUsers.sort((a, b) => b.points - a.points);
    const rankIndex = allUsers.findIndex(u => u.uid === user.uid);
    const rank = rankIndex !== -1 ? rankIndex + 1 : allUsers.length;

    res.json({ ...user, rank });
  } catch (error) {
    console.error('Error compiling user profile rank: ', error);
    res.status(500).json({ error: 'Profile endpoint failure' });
  }
});

// API Route: Submit Score Predictions
app.post('/api/predictions', async (req, res) => {
  try {
    const { userId, matchId, homeScore, awayScore } = req.body;
    if (!userId || !matchId) {
      return res.status(400).json({ error: 'User UID and Match ID are required' });
    }

    // Clear previous prediction for this match if it already exists
    const predictionsSnap = await db.collection('predictions').get();
    for (const pDoc of predictionsSnap.docs) {
      const predObj = pDoc.data();
      if (predObj.userId === userId && predObj.matchId === matchId) {
        await db.collection('predictions').doc(pDoc.id).delete();
      }
    }

    const predictionId = `pred-${Date.now()}`;
    const newPrediction: UserPrediction = {
      id: predictionId,
      userId,
      matchId,
      homeScore: parseInt(homeScore),
      awayScore: parseInt(awayScore),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await db.collection('predictions').doc(predictionId).set(newPrediction);

    // Sync user prediction counts
    let predictionCountForUser = 0;
    const freshPredictionsSnap = await db.collection('predictions').get();
    freshPredictionsSnap.forEach(pDoc => {
      if (pDoc.data().userId === userId) {
        predictionCountForUser += 1;
      }
    });

    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
      const uData = userSnap.data() as UserProfileData;
      uData.predictionsCount = predictionCountForUser;
      await userRef.set(uData);
    }

    res.json({ success: true, prediction: newPrediction });
  } catch (error) {
    console.error('Failed submitting prediction to Firestore: ', error);
    res.status(500).json({ error: 'Predictions write error' });
  }
});

// API Route: Get user predictions
app.get('/api/predictions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const snap = await db.collection('predictions').get();
    const list: UserPrediction[] = [];
    snap.forEach(pDoc => {
      const data = pDoc.data() as UserPrediction;
      if (data.userId === userId) {
        list.push(data);
      }
    });
    res.json(list);
  } catch (error) {
    console.error('Failed getting user predictions:', error);
    res.status(500).json({ error: 'Predictions read failure' });
  }
});

// API Route: Get Globals Leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const snap = await db.collection('users').get();
    const list: UserProfileData[] = [];
    snap.forEach(uDoc => {
      list.push(uDoc.data() as UserProfileData);
    });

    list.sort((a, b) => b.points - a.points);

    const leaderboardLayout: LeaderboardUser[] = list.map((u, idx) => ({
      userId: u.uid,
      displayName: u.displayName,
      points: u.points,
      accuracy: u.predictionsCount > 0 ? Math.round((u.points / (u.predictionsCount * 3)) * 100) : 0,
      rank: idx + 1
    }));

    res.json(leaderboardLayout);
  } catch (error) {
    console.error('Failed compiling leaderboard results: ', error);
    res.status(500).json({ error: 'Leaderboard compile failure' });
  }
});

// API Route: Premium Payments Subscription Upgrade
app.post('/api/subscribe', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User UID is needed' });
    }

    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      const user = userSnap.data() as UserProfileData;
      user.isPremium = true;
      await userRef.set(user);
      res.json({ success: true, message: 'Upgraded to premium successfully!', user });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error subscribing user to premium Mode: ', error);
    res.status(500).json({ error: 'Premium subscription execution failed' });
  }
});

// API Route: Premium AI Predictions - Server-side Gemini Client
app.post('/api/predict-ai', async (req, res) => {
  try {
    const { matchId, userId } = req.body;
    
    // Premium authorization verification
    const userRef = db.collection('users').doc(userId || 'demo-user');
    const userSnap = await userRef.get();
    if (!userSnap.exists || !(userSnap.data() as UserProfileData).isPremium) {
      return res.status(403).json({ error: 'Premium Subscription Required' });
    }

    const matchRef = db.collection('matches').doc(matchId);
    const matchSnap = await matchRef.get();
    if (!matchSnap.exists) {
      return res.status(404).json({ error: 'Match not found' });
    }
    const match = matchSnap.data() as Match;

    const homeTeam = match.homeTeam.name;
    const awayTeam = match.awayTeam.name;
    const group = match.group;
    const stadium = match.stadium;

    // Formatting formations and details
    const homeFormation = match.lineups?.home.formation || '4-3-3';
    const awayFormation = match.lineups?.away.formation || '5-3-2';

    const defaultAnalysis = {
      probabilities: { home: 45, draw: 25, away: 30 },
      predictedScore: `${homeTeam} 2 - 1 ${awayTeam}`,
      keyMatchup: "A direct midfield duel. Midway transitions will hold the center key.",
      tacticalAnalysis: `Expect ${homeTeam} to field a tactical ${homeFormation} focusing heavily on transitions, while ${awayTeam} relies on an tight defensive ${awayFormation} looking to exploit quick counter-attack opportunities.`,
      playerAvailability: "Both rosters are fully healthy. High speed clashes expected in final wings.",
    };

    if (!ai) {
      // If Gemini key is missing, return fallback immediately
      return res.json({ analysis: defaultAnalysis, isMock: true });
    }

    const prompt = `You are an elite tactical football analyst predicting a FIFA World Cup fixture.
Match: ${homeTeam} vs ${awayTeam} 
Group: ${group}
Stadium: ${stadium}
Home Formation: ${homeFormation}
Away Formation: ${awayFormation}

Provide tactical predictions for this match in JSON format containing exact fields:
{
  "probabilities": { "home": number, "draw": number, "away": number },
  "predictedScore": "string e.g. Home Team 2 - 1 Away Team",
  "keyMatchup": "string under 120 characters describing the single most interesting player matchup",
  "tacticalAnalysis": "string under 220 characters highlighting strategic formations and play styles",
  "playerAvailability": "string under 100 characters detailing roster depth or match readiness"
}
Ensure probabilities sum strictly to 100. Return raw JSON representation only, no markdown wrapping.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const responseText = response.text || '';
    // Clean potential codeblocks
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const resultObj = JSON.parse(cleanJson);
    res.json({ analysis: resultObj });

  } catch (error) {
    console.error('Gemini prediction failure, defaulting to fallback analysis: ', error);
    const matchRef = db.collection('matches').doc(req.body.matchId);
    const matchSnap = await matchRef.get();
    const match = matchSnap.exists ? (matchSnap.data() as Match) : null;
    const homeTeam = match?.homeTeam.name || 'Home';
    const awayTeam = match?.awayTeam.name || 'Away';
    res.json({
      analysis: {
        probabilities: { home: 45, draw: 25, away: 30 },
        predictedScore: `${homeTeam} 2 - 1 ${awayTeam}`,
        keyMatchup: "A direct midfield duel. Midway transitions will hold the center key.",
        tacticalAnalysis: "Tactical strategic formations are dynamic. Midfields expect deep-level physical runs.",
        playerAvailability: "Both rosters are fully healthy. High speed clashes expected in final wings.",
      },
      isMock: true
    });
  }
});

// Vite Middleware integration for SPA routing
async function initServer() {
  // Bootstrap or seed database empty check
  await seedDatabaseIfEmpty();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

initServer();

