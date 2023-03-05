const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());
let db = null;

const dbPath = path.join(__dirname, "dyte.db");

const initializeAndSetUpDatabase = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Local Host Server started at port 3000")
    );
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
};

initializeAndSetUpDatabase();

const authenticationToken = (req, res, next) => {
  let jwtToken;
  const authHeader = req.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    res.status(401);
    res.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        res.status(401);
        res.send("Invalid JWT Token");
      } else {
        req.name = payload.name;
        next();
      }
    });
  }
};
app.post("/login/", async (req, res) => {
  const { id, name } = req.body;
  const selectQuery = `
    SELECT * FROM student WHERE id='${id}';
    `;
  const dbUser = await db.get(selectQuery);
  console.log(dbUser);
  if (dbUser === undefined) {
    res.status(400);
    res.send("Invalid user");
  } else {
    const getRole = `    SELECT role FROM student WHERE id='${id}';
    `;
    const roleResult = await db.get(getRole);
    const payload = {
      name: name,
      role: roleResult.role,
    };
    console.log(payload);
    const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
    res.send({ jwtToken });
  }
});

const getUserDetailsFromPayLoad = async (req, res, next) => {
  let { name } = req;
  const getUserId = `
        SELECT id,role from student where name='${name}'
    `;
  const userDetails = await db.get(getUserId);
  if (userDetails === undefined) {
    res.status(401);
    res.send("Bad Request");
  } else {
    req.userId = userDetails.id;
    req.role = userDetails.role;
    next();
  }
};

app.get("/faculty/:faculty_id", authenticationToken, async (req, res) => {
  const { faculty_id } = req.params;
  const getQuery = `
       select * from faculty where id=${faculty_id}
    `;
  const result = await db.get(getQuery);
  const obj = { susses: true, data: result };
  res.send(obj);
});

app.get("/course/:course_id/", authenticationToken, async (req, res) => {
  const { course_id } = req.params;
  const getQuery = `
       select *
       from course inner join SLOT_COURSE on 
       course.id=SLOT_COURSE.course_id
       where course.id=${course_id}
    `;
  const result = await db.get(getQuery);
  res.send(result);
});

app.post(
  "/admin/slot",
  authenticationToken,
  getUserDetailsFromPayLoad,
  async (req, res) => {
    const { role } = req;
    if (role === "admin") {
      const { id, timings } = req.body;
      const { day, start, end } = timings;
      const postSlotQuery = `
      Insert into slot values('${id}');
      `;
      const postTimingsQuery = `
      Insert into timings values('${day}','${start}','${end}','${id}');
      `;
      const slot_result = db.run(postSlotQuery);
      const time_result = db.run(postTimingsQuery);
      const obj = { susses: true, data: req.body };
      res.send(obj);
    } else {
      res.status(400);
      res.send("Invalid Access");
    }
  }
);

app.get(
  "/timetable/",
  authenticationToken,
  getUserDetailsFromPayLoad,
  async (req, res) => {
    const { userId } = req;
    console.log(userId);
    const getQuery = `
        select * from registered_courses
    `;
    const result = db.all(getQuery);
    res.send(result);
  }
);

app.post(
  "/admin/faculty",
  authenticationToken,
  getUserDetailsFromPayLoad,
  async (req, res) => {
    const { role } = req;
    if (role === "admin") {
      const { id, name } = req.body;
      const postFacultyQuery = `
      Insert into faculty values(${id},'${name}');
      `;
      const time_result = db.run(postFacultyQuery);
      const obj = { susses: true, data: req.body };
      res.send(obj);
    } else {
      res.status(400);
      res.send("Invalid Access");
    }
  }
);

app.post(
  "/admin/student",
  authenticationToken,
  getUserDetailsFromPayLoad,
  async (req, res) => {
    const { role } = req;
    if (role === "admin") {
      const { id, name } = req.body;
      const postStudentQuery = `
      Insert into student values(${id},'${name}',"student");
      `;
      const time_result = db.run(postStudentQuery);
      const obj = { susses: true, data: req.body };
      res.send(obj);
    } else {
      res.status(400);
      res.send("Invalid Access");
    }
  }
);
module.exports = app;
