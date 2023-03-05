const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());
let db = null;

// __dirname: It's a variable in commonJS module that returns the path of the folder.

const dbPath = path.join(__dirname, "dyte.db");

//Initializing Database and server
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

//Authentication(middleware) using JWT token
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

//To get the user details from payload
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

//GET Faculty details with respect to faculty_id
app.get("/faculty/:faculty_id", authenticationToken, async (req, res) => {
  const { faculty_id } = req.params;

  const getQuery = `
       select * from faculty where id=${faculty_id}
    `;

  const result = await db.get(getQuery);
  const obj = { susses: true, data: result };

  res.send(obj);
});

//GET Course details with respect to course_id
app.get("/course/:course_id/", authenticationToken, async (req, res) => {
  const { course_id } = req.params;

  const getQuery = `
       select *
       from course inner join SLOT_COURSE on 
       course.id=SLOT_COURSE.course_id
       where course.id=${course_id}
    `;

  const result = await db.get(getQuery);
  const obj = { susses: true, data: result };

  res.send(obj);
});

//Add SLOT
app.post(
  "/admin/slot",
  authenticationToken,
  getUserDetailsFromPayLoad,
  async (req, res) => {
    const { role } = req;

    //Giving access only to admin user's
    if (role === "admin") {
      const { id, timings } = req.body;
      const { day, start, end } = timings;

      const postSlotQuery = `
      Insert into slot values('${id}');
      `;
      const postTimingsQuery = `
      Insert into timings values('${day}','${start}','${end}','${id}');
      `;

      const slot_result = await db.run(postSlotQuery);
      const time_result = await db.run(postTimingsQuery);

      const obj = { susses: true, data: req.body };

      res.send(obj);
    } else {
      res.status(400);
      res.send("Invalid Access");
    }
  }
);

//GET Timetable by joining registered_course, slot_courses, course, faculty, slot, timings
app.get(
  "/timetable/",
  authenticationToken,
  getUserDetailsFromPayLoad,
  async (req, res) => {
    const { userId } = req;

    const getQuery = `
        SELECT
        COURSE.name AS COURSE_NAME,
        COURSE.course_type AS COURSE_TYPE,
        FACULTY.name AS FACULTY_NAME,
        SLOT_COURSE.slot_id AS SLOT_ID,
        TIMINGS.DAY AS DAY,
        TIMINGS.START AS START,
        TIMINGS.END AS END
        FROM
        (
            (
                (
                    REGISTERED_COURSES
                    INNER JOIN SLOT_COURSE ON REGISTERED_COURSES.slot_course_id = SLOT_COURSE.id
                ) AS t
                INNER JOIN COURSE ON t.course_id = COURSE.id
            ) AS r
            INNER JOIN FACULTY ON r.faculty_id = FACULTY.id
        ) AS s
        INNER JOIN timings ON s.slot_id = timings.slot_id
        WHERE REGISTERED_COURSES.student_id = ${userId};
    `;

    const result = await db.all(getQuery);

    res.send({ success: true, data: result });
  }
);

//Add Faculty
app.post(
  "/admin/faculty",
  authenticationToken,
  getUserDetailsFromPayLoad,
  async (req, res) => {
    const { role } = req;
    //Giving access to admin only
    if (role === "admin") {
      const { id, name } = req.body;
      const postFacultyQuery = `
      Insert into faculty values(${id},'${name}');
      `;
      const time_result = await db.run(postFacultyQuery);
      const obj = { susses: true, data: req.body };
      res.send(obj);
    } else {
      res.status(400);
      res.send("Invalid Access");
    }
  }
);

//Add student
app.post(
  "/admin/student",
  authenticationToken,
  getUserDetailsFromPayLoad,
  async (req, res) => {
    const { role } = req;
    //Giving access to admin only
    if (role === "admin") {
      const { id, name } = req.body;

      const postStudentQuery = `
      Insert into student values(${id},'${name}',"student");
      `;

      const time_result = await db.run(postStudentQuery);
      const obj = { susses: true, data: req.body };
      res.send(obj);
    } else {
      res.status(400);
      res.send("Invalid Access");
    }
  }
);

//Add Course
app.post(
  "/admin/course/",
  authenticationToken,
  getUserDetailsFromPayLoad,
  async (req, res) => {
    const { role } = req;

    //Giving access to admin only
    if (role === "admin") {
      const { id, name, slot_ids, faculty_ids, course_type } = req.body;
      const count = `
      SELECT COUNT(*) FROM slot_course;
      `;
      //To avoid unique key constraint
      const primaryId = await db.get(count);
      let resultId = primaryId + 1;
      let dummy = id;
      for (let i = 0; i < faculty_ids.length; i++) {
        const postQuery = `
                    insert into course values(${dummy},'${name}','${course_type}',${faculty_ids[i]})
                `;
        const postSlotCourse = `
                    insert into slot_course values (${resultId},'${slot_ids[i]}',${id})
                `;

        //Updating Key Value
        dummy = dummy + 1;
        resultId = resultId + 1;
        const result1 = await db.run(postQuery);
        const result2 = await db.run(postSlotCourse);
      }

      const obj = { success: true, data: req.body };

      res.send(obj);
    } else {
      res.status(400);
      res.send("Invalid Access");
    }
  }
);

//Student Registration
app.post(
  "/register/",
  authenticationToken,
  getUserDetailsFromPayLoad,
  async (req, res) => {
    const { userId } = req;
    const { course_id, slot_ids } = req.body;

    //Verifying whether the slot and course pair exist or not.
    const getQuery = `
    select * from REGISTERED_COURSES
        INNER JOIN SLOT_COURSE ON REGISTERED_COURSES.slot_course_id = SLOT_COURSE.id
    `;
    const result = await db.all(getQuery);
    let flag = 1;
    for (let i = 0; i < result.length; i++) {
      if (result.course_id === course_id || result.slot_id === slot_ids) {
        flag = 0;
        break;
      }
    }

    //Checking the clashes with other slots.
    if (flag === 1) {
      const count = `
      SELECT COUNT(*) FROM registered_courses;
      `;
      const primaryId = await db.get(count);
      const resultId = primaryId + 1;

      const getSlotCourseId = `
      SELECT id FROM slot_course where course_id=${course_id} and slot_id='${slot_ids}';
      `;
      const slot_course_id = await db.get(getSlotCourseId);

      const postQuery = `
      INSERT INTO registered_courses values(${resultId},${slot_course_id},${userId})
      `;
      const finalResult = await db.run(postQuery);

      res.send("Success");
    } else {
      console.log("Slot Crash, Try Again!!!");
    }
  }
);

module.exports = app;
