"""
Placement Database Seeder
Seeds initial campus placement drives into career_assistant.db if the table is empty.
"""
from datetime import datetime, timedelta, timezone
import json
from sqlalchemy.orm import Session
from app.database.models import PlacementDriveModel

def seed_placement_drives(db: Session):
    """Populates realistic university placement drives if none exist."""
    existing_count = db.query(PlacementDriveModel).count()
    if existing_count > 0:
        return

    now = datetime.now(timezone.utc)
    drives = [
        PlacementDriveModel(
            company_name="Google Cloud Technologies",
            job_title="Associate Cloud Engineer",
            job_description=(
                "Google Cloud is hiring Associate Cloud Engineers to architect and deploy distributed, "
                "fault-tolerant cloud infrastructure. Responsibilities include containerized deployments "
                "using Kubernetes, Terraform automation, and designing multi-region architectures. "
                "Candidates should have strong knowledge of Linux systems, Python/Go, and cloud fundamentals."
            ),
            location="Bangalore / Hyderabad",
            employment_type="Full-time",
            package_min=14.0,
            package_max=18.5,
            minimum_cgpa=7.5,
            minimum_attendance=75.0,
            eligible_departments=json.dumps(["MCA", "CSE", "IT"]),
            eligible_batches=json.dumps(["2026", "2027"]),
            application_deadline=now + timedelta(days=30),
            status="OPEN",
            created_by="tpo"
        ),
        PlacementDriveModel(
            company_name="Microsoft India",
            job_title="Software Development Engineer (Full Stack)",
            job_description=(
                "Microsoft India R&D is seeking high-potential engineers for core platform development. "
                "You will work on Azure cloud services, high-throughput microservices, and modern web frameworks. "
                "Requirements: Solid understanding of data structures, algorithms, object-oriented design, "
                "and modern web stacks (React, Node/FastAPI/C#)."
            ),
            location="Hyderabad / Noida / Remote",
            employment_type="Full-time",
            package_min=18.0,
            package_max=24.0,
            minimum_cgpa=8.0,
            minimum_attendance=75.0,
            eligible_departments=json.dumps(["MCA", "CSE"]),
            eligible_batches=json.dumps(["2026", "2027"]),
            application_deadline=now + timedelta(days=25),
            status="OPEN",
            created_by="tpo"
        ),
        PlacementDriveModel(
            company_name="TCS Digital & Innovator",
            job_title="Systems Development Engineer",
            job_description=(
                "TCS Digital is looking for technology innovators to develop enterprise digital transformation solutions. "
                "Key domains include Cloud Migration, Big Data Analytics, API Gateways, and DevSecOps. "
                "Open to all computer applications and engineering graduates."
            ),
            location="Pan-India",
            employment_type="Full-time",
            package_min=7.5,
            package_max=9.5,
            minimum_cgpa=6.5,
            minimum_attendance=70.0,
            eligible_departments=json.dumps(["MCA", "CSE", "IT", "ECE"]),
            eligible_batches=json.dumps(["2026", "2027"]),
            application_deadline=now + timedelta(days=20),
            status="OPEN",
            created_by="tpo"
        ),
        PlacementDriveModel(
            company_name="Zomato / Blinkit Tech",
            job_title="Backend Systems Engineer",
            job_description=(
                "Join India's leading quick-commerce and food delivery tech engineering team. "
                "Build low-latency order routing engines, real-time inventory management, and BLE-driven warehouse logistics. "
                "Tech stack: Python, Golang, Redis, Kafka, PostgreSQL."
            ),
            location="Gurgaon / Hybrid",
            employment_type="Full-time",
            package_min=12.0,
            package_max=16.0,
            minimum_cgpa=7.0,
            minimum_attendance=75.0,
            eligible_departments=json.dumps(["MCA", "CSE"]),
            eligible_batches=json.dumps(["2026", "2027"]),
            application_deadline=now + timedelta(days=15),
            status="OPEN",
            created_by="tpo"
        )
    ]

    for d in drives:
        db.add(d)
    db.commit()
    print(f"Seeded {len(drives)} initial placement drives.")
