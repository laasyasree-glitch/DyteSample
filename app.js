const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());
let db = null;

const dbPath = path.join(__dirname, "twitterClone.db");

const initializeAndSetUpDatabase = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3010, () =>
      console.log("Local Host Server started at port 3010")
    );
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
};

app.post("/register/", async (req, res) => {
  const { username, password, name, gender } = req.body;
  console.log(password.length);
  if (password.length < 6) {
    res.status(400);
    res.send("Password is too short");
  } else {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const selectQuery = `
        SELECT * FROM user where username='${username}'
    `;
    const dbUser = await db.get(selectQuery);
    if (dbUser === undefined) {
      console.log("hello");
      const createUserQuery = `
        INSERT INTO user(username,password,name,gender)
        values('${username}','${hashedPassword}','${name}','${gender}')
        `;
      const dbResponse = await db.run(createUserQuery);
      res.status(200);
      res.send("User created successfully");
    } else {
      res.status(400);
      res.send("User already exists");
    }
  }
});

const authenticationToken = (req, res, next) => {
  let jwtToken;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    res.send(401);
    res.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        res.status(400);
        res.send("Invalid JWT token");
      } else {
        next();
      }
    });
  }
};
app.post("/login/", async (req, res) => {
  const { username, password } = req.body;
  const selectQuery = `
    SELECT * FROM USER WHERE USERNAME='${username}';
    `;
  const dbUser = await db.get(selectQuery);
  if (dbUser === undefined) {
    res.status(400);
    res.send("Invalid user");
  } else {
    const isPasswordMatch = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatch === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      res.send({ jwtToken });
    } else {
      res.status(400);
      res.send("Invalid password");
    }
  }
});

initializeAndSetUpDatabase();

module.exports = app;
