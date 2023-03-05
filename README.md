# VIT FFCS REGISTRATION

We have 6 tables, Faculty, Student, Course, Slot, Timings, Registered_Courses, Slot_Course.

Relationship:

Faculty -> Course: Many to One.
Slot -> Course: Many to Many.
Slot -> Timing: One to many.
Student -> Registered_Courses: One to Many.
Slot_Course -> Junction Table

**Faculty**

| Column   | Type    |
| -------- | ------- |
| id       | INTEGER |
| name     | VARCHAR |

**Course Table**

| Column              | Type    |
| ------------------- | ------- |
| id                  | INTEGER |
| name                | VARCHAR |
| course_type         | VARCHAR |
| faculty_id          | INTEGER |

**Slot table**

| Column    | Type     |
| --------- | -------- |
| id        | VARCHAR  |

**Timings Table**

| Column    | Type     |
| --------- | -------- |
| day       | VARCHAR  |
| start     | DATETIME |
| end       | DATETIME |
| slot_id   | VARCHAR  |

**Slot_Course Table**

| Column    | Type     |
| --------- | -------- |
| id        | INTEGER  |
| slot_id   | VARCHAR  |
| course_id | INTEGER  |

**Student Table**

| Column   | Type    |
| -------- | ------- |
| id       | INTEGER |
| name     | VARCHAR |
| role     | VARCHAR |

**Registered_Courses Table**

| Column   | Type    |
| -------- | ------- |
| id       | INTEGER |
| slot_course_id
           | VARCHAR |
| student_id
           | VARCHAR |

Please git clone my project in your system, for testing purpose.

## Install

    $ git clone https://github.com/YOUR_USERNAME/PROJECT_TITLE
    $ cd PROJECT_TITLE
    $ yarn install

## Configure app

Open `a/nice/path/to/a.file` then edit it with your settings. You will need:

- A setting;
- Another setting;
- One more setting;

## Running the project

    $ yarn start

## Simple build for production

    $ yarn build


Use `npm install` to install the packages.

**Export the express instance using the default export syntax.**

**Use Common JS module syntax.**
