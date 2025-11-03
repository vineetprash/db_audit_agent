
Real-time database audit system with PostgreSQL. Track all INSERT/UPDATE/DELETE operations via audit logs. Detect suspicious activities automatically. CRUD operations for Users (Admin/Dean/Faculty/Student with rollNo/marks) and Courses. Socket.io for live log streaming. Day/Night Mode.

Docker command to setup database
`docker run -d --name audit_db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=audit_db -p 5432:5432 postgres:16-alpine

<img width="1772" height="951" alt="image" src="https://github.com/user-attachments/assets/9d3aac4d-df32-44c6-a5c9-62f179d8cebb" />
<img width="1773" height="1002" alt="image" src="https://github.com/user-attachments/assets/813520a3-fbbd-45e6-a942-5d79f51c0fa2" />
<img width="1742" height="992" alt="image" src="https://github.com/user-attachments/assets/ab75533c-20c3-4d1a-9e29-5d839a8a0299" />
