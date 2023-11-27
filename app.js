const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();
app.use(express.json());
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
let db = null;
const dbpath = path.join(__dirname, "covid19IndiaPortal.db");
const intializerDBAndSaver = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};
intializerDBAndSaver();

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeaders = request.headers["authorization"];
  if (authHeaders !== undefined) {
    jwtToken = authHeaders.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

app.post("/register/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
      INSERT INTO 
        user (username, name, password, gender, location) 
      VALUES 
        (
          '${username}', 
          '${name}',
          '${hashedPassword}', 
          '${gender}',
          '${location}'
        )`;
    const dbResponse = await db.run(createUserQuery);
    const newUserId = dbResponse.lastID;
    response.send(`Created new user with ${newUserId}`);
  } else {
    response.status = 400;
    response.send("User already exists");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const ispasswordMatch = await bcrypt.compare(password, dbUser.password);
    if (ispasswordMatch === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status("400");
      response.send("Invalid password");
    }
  }
});

app.get("/states/", authenticateToken, async (request, response) => {
  let { username } = request;
  const getStatesQuery = `
    SELECT * FROM state ;`;
  const thing = await db.all(getStatesQuery);
  const fullans = (thing) => {
    return {
      stateId: thing.stateId,
      stateName: thing.stateName,
      population: thing.population,
    };
  };
  response.send(thing.map((eachstate) => fullans(eachstate)));
});

app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  let { username } = request;
  const { stateId } = request.params;
  const gettingIdQuery = `
    SELECT * FROM state WHERE state_id = ${stateId};`;
  const thing = await db.get(gettingIdQuery);
  const fullans = (thing) => {
    return {
      stateId: thing.stateId,
      stateName: thing.stateName,
      population: thing.population,
    };
  };
  response.send(fullans(thing));
});

app.post("/districts/", authenticateToken, async (request, response) => {
  let { username } = request;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const theQuery = `
    INSERT INTO district (district_name,state_id,cases,cured,active,deaths)
    VALUES('${districtName}',
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths});`;
  const dbresponse = await db.run(theQuery);
  const districtId = dbresponse.lastID;
  response.send("District Successfully Added");
});

app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    let { username } = request;
    const { districtId } = request.params;
    const gettingIdQuery = `
    SELECT * FROM district WHERE district_id = ${districtId};`;
    const thing = await db.get(gettingIdQuery);
    const fullans = (thing) => {
      return {
        districtId: thing.districtId,
        districtName: thing.districtName,
        stateId: thing.stateId,
        cases: thing.cases,
        cured: thing.cured,
        active: thing.active,
        deaths: thing.deaths,
      };
    };
    response.send(fullans(thing));
  }
);

app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    let { username } = request;
    const { districtId } = request.params;
    const theQuery = `
    DELETE FROM district
    WHERE district_id = ${districtId};`;
    await db.run(theQuery);
    response.send("District Removed");
  }
);

app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    let { username } = request;
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cured,
      cases,
      active,
      deaths,
    } = request.body;
    const theQuery = `
    UPDATE district SET
    districtName = '${districtName}',
    stateId= ${stateId},
    cured= ${cured},
    cases = ${cases},
    active = ${active},
    deaths = ${deaths};`;
    await db.run(theQuery);
    response.send("District Details Updated");
  }
);

app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    let { username } = request;
    const { stateId } = request.params;
    const theQuery = `
    SELECT * FROM state
    WHERE state_id = ${stateId};`;
    const dbresponse = await gb.get(theQuery);
    const fullans = (dbresponse) => {
      return {
        totalCases: fullans.totalcases,
        totalCured: fullans.totalcured,
        totalActive: fullans.totalactive,
        totalDeaths: fullans.totaldeaths,
      };
    };
    response.send(fullans(dbresponse));
  }
);

module.exports = app;
