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
    app.listen(3014, () =>
      console.log("Local Host Server started at port 3014")
    );
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
};

initializeAndSetUpDatabase();

app.post("/register/", async (req, res) => {
  const { username, password, name, gender } = req.body;
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
        res.status(401);
        res.send("Invalid JWT Token");
      } else {
        req.username = payload.username;
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

const getUserDetailsFromPayLoad = async (req, res, next) => {
  let { username } = req;
  const getUserId = `
        SELECT user_id from user where username='${username}'
    `;
  const userDetails = await db.get(getUserId);
  if (userDetails === undefined) {
    res.status(401);
    res.send("Bad Request");
  } else {
    req.userId = userDetails.user_id;
    next();
  }
};

app.get(
  "/user/following",
  authenticationToken,
  getUserDetailsFromPayLoad,
  async (req, res) => {
    const userId = req.userId;
    const getQuery = `
        select name from user where user_id in
        (select following_user_id from follower
            where follower_user_id=${userId})
    `;
    const result = await db.all(getQuery);
    res.send(result);
  }
);

app.get(
  "/user/followers",
  authenticationToken,
  getUserDetailsFromPayLoad,
  async (req, res) => {
    const userId = req.userId;
    const getQuery = `
        select name from user where user_id in(
            select follower_user_id from follower
            where following_user_id=${userId}
        )
    `;
    const result = await db.all(getQuery);
    res.send(result);
  }
);

app.get(
  "/tweets/:tweetId/",
  authenticationToken,
  getUserDetailsFromPayLoad,
  async (req, res) => {
    const userId = req.userId;
    const { tweetId } = req.params;

    const getQuery = `
        select user_id from user where user_id in
        (select following_user_id from follower
            where follower_user_id=${userId})
    `;

    const result = await db.all(getQuery);
    let list_a = result.map((x) => x.user_id);

    const getIdOfTweetId = `
            SELECT user_id from tweet where  tweet_id=${tweetId}
    `;
    const check = await db.get(getIdOfTweetId);

    if (check.user_id in list_a) {
      const finalQuery = `
         select tweet,count(like_id) as likes, date_time 
        from like inner join tweet on tweet.tweet_id= like.tweet_id
        where tweet.tweet_id=${tweetId}
        group by tweet.tweet_id
      `;
      const result1 = await db.get(finalQuery);

      const finalQuery1 = `
         select count(reply_id) as replies 
        from reply inner join tweet on tweet.tweet_id= reply.tweet_id
        where tweet.tweet_id=${tweetId}
        group by tweet.tweet_id
      `;
      const result2 = await db.get(finalQuery1);

      const new_obj = {
        tweet: result1.tweet,
        likes: result1.likes,
        replies: result2.replies,
        dateTime: result1.date_time,
      };

      res.send(new_obj);
    } else {
      res.status(401);
      res.send("Invalid Request");
    }
  }
);

app.get(
  "/user/tweets/feed/",
  authenticationToken,
  getUserDetailsFromPayLoad,
  async (req, res) => {
    const userId = req.userId;

    const extractQuery = `
        select username, tweet, date_time as dateTime from tweet 
        natural join user where user_id in
        
            (
                select following_user_id from follower
                where follower_user_id=${userId}
            )
        order by date_time desc limit 4
    `;

    const result1 = await db.all(extractQuery);
    res.send(result1);
  }
);

app.get(
  "/tweets/:tweetId/likes/",
  authenticationToken,
  getUserDetailsFromPayLoad,
  async (req, res) => {
    const userId = req.userId;
    const { tweetId } = req.params;

    const getQuery = `
        select user_id from user where user_id in
        (select following_user_id from follower
            where follower_user_id=${userId})
    `;

    const result = await db.all(getQuery);
    let list_a = result.map((x) => x.user_id);

    const getIdOfTweetId = `
            SELECT user_id from tweet where  tweet_id=${tweetId}
    `;
    const check = await db.get(getIdOfTweetId);

    if (check.user_id in list_a) {
      const finalQuery = `
        select distinct name from (like inner join tweet on like.tweet_id=tweet.tweet_id) as T
        inner join user on T.user_id=user.user_id
      `;
      const result1 = await db.all(finalQuery);
      const list_b = result1.map((x) => x.name);
      res.send({ likes: list_b });
    } else {
      res.status(401);
      res.send("Invalid Request");
    }
  }
);

app.get(
  "/tweets/:tweetId/replies/",
  authenticationToken,
  getUserDetailsFromPayLoad,
  async (req, res) => {
    const userId = req.userId;
    const { tweetId } = req.params;

    const getQuery = `
        select user_id from user where user_id in
        (select following_user_id from follower
            where follower_user_id=${userId})
    `;

    const result = await db.all(getQuery);
    let list_a = result.map((x) => x.user_id);

    const getIdOfTweetId = `
            SELECT user_id from tweet where  tweet_id=${tweetId}
    `;
    const check = await db.get(getIdOfTweetId);

    if (check.user_id in list_a) {
      const finalQuery = `
        select name,reply from (reply inner join tweet on reply.tweet_id=tweet.tweet_id) as T
        inner join user on T.user_id=user.user_id
      `;
      const result1 = await db.all(finalQuery);
      res.send({ replies: result1 });
    } else {
      res.status(401);
      res.send("Invalid Request");
    }
  }
);

// app.get(
//   "/user/tweets/",
//   authenticationToken,
//   getUserDetailsFromPayLoad,
//   async (req, res) => {
//     const userId = req.userId;
//     const finalQuery = `
//          select tweet,count(like_id) as likes, count(reply_id) date_time as dateTime
//         from (like inner join tweet on tweet.tweet_id= like.tweet_id)
//         as T left join T.tweet_id
//         where tweet.user_id=${userId}
//         group by tweet.tweet_id order by dateTime desc
//       `;
//     const result1 = await db.all(finalQuery);
//     res.send(result1);
//   }
// );

app.post(
  "/user/tweets/",
  authenticationToken,
  getUserDetailsFromPayLoad,
  async (req, res) => {
    const userId = req.userId;
    const { tweet } = req.body;
    const date = new Date();
    const postQuery = `
        inSert into tweet(tweet,user_id)
        values('${tweet}',${userId})
    `;
    const result1 = await db.run(postQuery);
    res.send("Created a Tweet");
  }
);

app.delete(
  "/tweets/:tweetId/",
  authenticationToken,
  getUserDetailsFromPayLoad,
  async (req, res) => {
    const { tweetId } = req.params;
    const delQuery = `
        delete from tweet where tweet_id=${tweetId}
    `;
    const result1 = await db.run(delQuery);
    res.send("Tweet Removed");
  }
);

module.exports = app;
