const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(data);
        // Ensure arrays exist
        if (!parsed.activeQueues) parsed.activeQueues = [];
        if (!parsed.completedConsultations) parsed.completedConsultations = [];
        if (!parsed.reviews) parsed.reviews = [];
        return parsed;
    } catch (error) {
        return getInitialData();
    }
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getInitialData() {
    const today = new Date().toISOString().split('T')[0];
    return {
        hospitals: [{ id: 1, name: "DocEase Medical Center", address: "123 Healthcare Avenue", phone: "+91 1800 123 4567", email: "contact@docease.com" }],
        doctors: [
            { id: 1, name: "Dr. Rajesh Kumar", specialization: "Cardiologist", fee: 1200, availableTime: "09:00 - 17:00", rating: 4.8, totalReviews: 0, experience: "15 years", qualification: "MD, DM Cardiology" },
            { id: 2, name: "Dr. Priya Sharma", specialization: "Dermatologist", fee: 1000, availableTime: "10:00 - 18:00", rating: 4.9, totalReviews: 0, experience: "10 years", qualification: "MD Dermatology" },
            { id: 3, name: "Dr. Amit Patel", specialization: "Orthopedic", fee: 1100, availableTime: "09:00 - 16:00", rating: 0, totalReviews: 0, experience: "12 years", qualification: "MS Orthopedics" },
            { id: 4, name: "Dr. Kavita Desai", specialization: "Dentist", fee: 800, availableTime: "10:00 - 18:00", rating: 0, totalReviews: 0, experience: "10 years", qualification: "BDS, MDS" }
        ],
        patients: [
            { id: 1, name: "Aarav Sharma", email: "aarav@test.com", password: "patient123", phone: "9876500001", age: 32, bloodGroup: "O+", address: "Delhi", medicalHistory: "No significant history", consultations: [] },
            { id: 2, name: "Vihaan Gupta", email: "vihaan@test.com", password: "patient123", phone: "9876500002", age: 28, bloodGroup: "A+", address: "Mumbai", medicalHistory: "Mild Hypertension", consultations: [] },
            { id: 3, name: "Vanya Mehta", email: "vanya@test.com", password: "patient123", phone: "9876500003", age: 35, bloodGroup: "B+", address: "Bangalore", medicalHistory: "Asthma", consultations: [] }
        ],
        users: [
            { id: 1, name: "Admin", email: "admin@docease.com", password: "admin123", role: "ADMIN" },
            { id: 2, name: "Dr. Rajesh Kumar", email: "rajesh@docease.com", password: "doctor123", role: "DOCTOR", doctorId: 1 },
            { id: 3, name: "Dr. Priya Sharma", email: "priya@docease.com", password: "doctor123", role: "DOCTOR", doctorId: 2 },
            { id: 4, name: "Dr. Amit Patel", email: "amit@docease.com", password: "doctor123", role: "DOCTOR", doctorId: 3 },
            { id: 5, name: "Dr. Kavita Desai", email: "kavita@docease.com", password: "doctor123", role: "DOCTOR", doctorId: 4 }
        ],
        activeQueues: [],
        completedConsultations: [],
        reviews: []
    };
}

// ==================== AUTHENTICATION ====================

app.post('/api/auth/login', (req, res) => {
    const { email, password, role } = req.body;
    const data = loadData();

    if (role === 'PATIENT') {
        const patient = data.patients.find(p => p.email === email && p.password === password);
        if (patient) return res.json({ success: true, userId: patient.id, name: patient.name, role: 'PATIENT', patientId: patient.id });
    } else if (role === 'DOCTOR') {
        const user = data.users.find(u => u.email === email && u.password === password && u.role === 'DOCTOR');
        if (user) return res.json({ success: true, userId: user.id, name: user.name, role: 'DOCTOR', doctorId: user.doctorId });
    } else if (role === 'ADMIN') {
        const user = data.users.find(u => u.email === email && u.password === password && u.role === 'ADMIN');
        if (user) return res.json({ success: true, userId: user.id, name: user.name, role: 'ADMIN' });
    }
    res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/auth/register', (req, res) => {
    const { name, email, password, phone, age, bloodGroup, address, medicalHistory } = req.body;
    const data = loadData();
    if (data.patients.find(p => p.email === email)) {
        return res.status(400).json({ error: 'Email already registered' });
    }
    const newPatient = {
        id: data.patients.length + 1,
        name, email, password, phone,
        age: parseInt(age), bloodGroup, address,
        medicalHistory: medicalHistory || 'None recorded',
        consultations: []
    };
    data.patients.push(newPatient);
    saveData(data);
    res.json({ success: true, message: 'Registration successful' });
});

// ==================== DOCTOR APIs ====================

app.get('/api/doctors', (req, res) => {
    const data = loadData();
    res.json(data.doctors);
});

app.get('/api/doctors/:id', (req, res) => {
    const data = loadData();
    const doctor = data.doctors.find(d => d.id === parseInt(req.params.id));
    res.json(doctor);
});

// ==================== PATIENT APIs ====================

app.get('/api/patients/:id', (req, res) => {
    const data = loadData();
    const patient = data.patients.find(p => p.id === parseInt(req.params.id));
    res.json(patient);
});

app.get('/api/patients/:id/history', (req, res) => {
    const data = loadData();
    const patient = data.patients.find(p => p.id === parseInt(req.params.id));
    res.json({
        medicalHistory: patient?.medicalHistory || 'None',
        consultations: patient?.consultations || []
    });
});

// ==================== QUEUE & APPOINTMENT APIs ====================

// Book an appointment - Adds patient to doctor's queue
app.post('/api/appointments/book', (req, res) => {
    const { patientId, patientName, doctorId, doctorName, date, symptoms } = req.body;
    const data = loadData();
    
    // Get current queue for this doctor
    let doctorQueue = data.activeQueues.find(q => q.doctorId === doctorId && q.date === date);
    
    if (!doctorQueue) {
        doctorQueue = {
            doctorId: doctorId,
            doctorName: doctorName,
            date: date,
            patients: [],
            currentServing: null,
            servingStartTime: null
        };
        data.activeQueues.push(doctorQueue);
    }
    
    // Check if patient already has an active appointment for today
    const existing = doctorQueue.patients.find(p => p.patientId === patientId);
    if (existing) {
        return res.status(400).json({ error: 'You already have an appointment today' });
    }
    
    // Add patient to queue
    const queueNumber = doctorQueue.patients.length + 1;
    const token = `Q${String(queueNumber).padStart(3, '0')}`;
    const estimatedWait = doctorQueue.patients.length * 15;
    
    const newAppointment = {
        patientId: patientId,
        patientName: patientName,
        symptoms: symptoms || 'Not specified',
        bookedAt: new Date().toISOString(),
        queueNumber: queueNumber,
        token: token,
        estimatedWait: estimatedWait,
        status: 'WAITING'
    };
    
    doctorQueue.patients.push(newAppointment);
    saveData(data);
    
    res.json({ 
        success: true, 
        token: token, 
        queueNumber: queueNumber, 
        estimatedWait: estimatedWait,
        position: queueNumber
    });
});

// Get doctor's queue
app.get('/api/queue/doctor/:doctorId', (req, res) => {
    const data = loadData();
    const today = new Date().toISOString().split('T')[0];
    const doctorQueue = data.activeQueues.find(q => q.doctorId === parseInt(req.params.doctorId) && q.date === today);
    
    if (!doctorQueue) {
        return res.json({ waitingList: [], currentPatient: null, waitingCount: 0 });
    }
    
    // Calculate wait times for each patient
    let cumulativeWait = 0;
    const waitingList = doctorQueue.patients.filter(p => p.status === 'WAITING').map(patient => {
        const waitTime = cumulativeWait;
        cumulativeWait += 15;
        return { ...patient, waitTime: waitTime };
    });
    
    res.json({
        waitingList: waitingList,
        currentPatient: doctorQueue.currentServing ? {
            ...doctorQueue.currentServing,
            startedAt: doctorQueue.servingStartTime
        } : null,
        waitingCount: waitingList.length
    });
});

// Get patient's queue position
app.get('/api/queue/patient/:patientId', (req, res) => {
    const data = loadData();
    const today = new Date().toISOString().split('T')[0];
    
    for (const queue of data.activeQueues) {
        if (queue.date === today) {
            const patient = queue.patients.find(p => p.patientId === parseInt(req.params.patientId));
            if (patient && patient.status === 'WAITING') {
                const ahead = queue.patients.filter(p => p.status === 'WAITING' && p.queueNumber < patient.queueNumber).length;
                return res.json({
                    hasAppointment: true,
                    token: patient.token,
                    position: ahead + 1,
                    estimatedWait: ahead * 15,
                    doctorName: queue.doctorName,
                    status: patient.status
                });
            }
            if (queue.currentServing && queue.currentServing.patientId === parseInt(req.params.patientId)) {
                return res.json({
                    hasAppointment: true,
                    token: queue.currentServing.token,
                    position: 0,
                    estimatedWait: 0,
                    doctorName: queue.doctorName,
                    status: 'IN_PROGRESS',
                    startedAt: queue.servingStartTime
                });
            }
        }
    }
    res.json({ hasAppointment: false });
});

// Start serving a patient (doctor calls next patient)
app.post('/api/queue/doctor/:doctorId/start-next', (req, res) => {
    const data = loadData();
    const today = new Date().toISOString().split('T')[0];
    const doctorQueue = data.activeQueues.find(q => q.doctorId === parseInt(req.params.doctorId) && q.date === today);
    
    if (!doctorQueue) {
        return res.status(404).json({ error: 'No active queue' });
    }
    
    const nextPatient = doctorQueue.patients.find(p => p.status === 'WAITING');
    
    if (!nextPatient) {
        return res.status(404).json({ error: 'No patients waiting' });
    }
    
    // Mark as current serving
    doctorQueue.currentServing = nextPatient;
    doctorQueue.servingStartTime = new Date().toISOString();
    
    // Update patient status
    nextPatient.status = 'IN_PROGRESS';
    
    saveData(data);
    res.json({ success: true, patient: nextPatient });
});

// Complete current consultation
app.post('/api/queue/doctor/:doctorId/complete', (req, res) => {
    const data = loadData();
    const today = new Date().toISOString().split('T')[0];
    const doctorQueue = data.activeQueues.find(q => q.doctorId === parseInt(req.params.doctorId) && q.date === today);
    
    if (!doctorQueue || !doctorQueue.currentServing) {
        return res.status(404).json({ error: 'No active consultation' });
    }
    
    const completedPatient = doctorQueue.currentServing;
    const endTime = new Date().toISOString();
    const startTime = doctorQueue.servingStartTime;
    const duration = Math.floor((new Date(endTime) - new Date(startTime)) / 1000 / 60); // minutes
    
    // Add to completed consultations
    const consultationRecord = {
        id: data.completedConsultations.length + 1,
        patientId: completedPatient.patientId,
        patientName: completedPatient.patientName,
        doctorId: doctorQueue.doctorId,
        doctorName: doctorQueue.doctorName,
        date: today,
        symptoms: completedPatient.symptoms,
        token: completedPatient.token,
        duration: duration,
        completedAt: endTime
    };
    data.completedConsultations.push(consultationRecord);
    
    // Update patient's consultation history
    const patient = data.patients.find(p => p.id === completedPatient.patientId);
    if (patient) {
        patient.consultations.push({
            date: today,
            doctorName: doctorQueue.doctorName,
            symptoms: completedPatient.symptoms,
            token: completedPatient.token
        });
    }
    
    // Remove from current queue
    doctorQueue.patients = doctorQueue.patients.filter(p => p.patientId !== completedPatient.patientId);
    doctorQueue.currentServing = null;
    doctorQueue.servingStartTime = null;
    
    // Renumber remaining patients
    doctorQueue.patients.forEach((p, idx) => {
        p.queueNumber = idx + 1;
        p.token = `Q${String(p.queueNumber).padStart(3, '0')}`;
    });
    
    saveData(data);
    res.json({ success: true, duration: duration });
});

// ==================== REVIEW APIs ====================

app.post('/api/reviews/submit', (req, res) => {
    const { doctorId, patientId, patientName, rating, comment } = req.body;
    const data = loadData();
    
    const newReview = {
        id: data.reviews.length + 1,
        doctorId, patientId, patientName,
        rating: parseInt(rating),
        comment: comment || '',
        date: new Date().toISOString()
    };
    
    data.reviews.push(newReview);
    
    // Update doctor rating
    const doctor = data.doctors.find(d => d.id === doctorId);
    const doctorReviews = data.reviews.filter(r => r.doctorId === doctorId);
    const avgRating = doctorReviews.reduce((sum, r) => sum + r.rating, 0) / doctorReviews.length;
    doctor.rating = Math.round(avgRating * 10) / 10;
    doctor.totalReviews = doctorReviews.length;
    
    saveData(data);
    res.json({ success: true });
});

app.get('/api/reviews/doctor/:doctorId', (req, res) => {
    const data = loadData();
    const reviews = data.reviews.filter(r => r.doctorId === parseInt(req.params.doctorId));
    const doctor = data.doctors.find(d => d.id === parseInt(req.params.doctorId));
    res.json({
        averageRating: doctor?.rating || 0,
        totalReviews: doctor?.totalReviews || 0,
        reviews: reviews.slice(-10).reverse()
    });
});

// ==================== REPORT GENERATION ====================

app.get('/api/report/consultation/:patientId/:doctorId', (req, res) => {
    const data = loadData();
    const patient = data.patients.find(p => p.id === parseInt(req.params.patientId));
    const doctor = data.doctors.find(d => d.id === parseInt(req.params.doctorId));
    const today = new Date().toISOString().split('T')[0];
    
    // Find the consultation that happened today
    const consultation = patient.consultations.find(c => c.date === today);
    
    if (!consultation) {
        return res.status(404).json({ error: 'No consultation found for today' });
    }
    
    const hospital = data.hospitals[0];
    const doc = new PDFDocument({ margin: 50 });
    const filename = `Consultation_Report_${patient.name}_${today}.pdf`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);
    
    // Professional Report
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#1a237e').text('DOCEASE MEDICAL CENTER', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#666').text(hospital.address, { align: 'center' });
    doc.text(`Tel: ${hospital.phone} | Email: ${hospital.email}`, { align: 'center' });
    doc.moveDown();
    doc.strokeColor('#1a237e').lineWidth(2).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#333').text('CONSULTATION REPORT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).fillColor('#666').text(`Report Generated: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown();
    
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a237e').text('PATIENT DETAILS');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Name: ${patient.name}`);
    doc.text(`Patient ID: DOC-${String(patient.id).padStart(6, '0')}`);
    doc.text(`Age: ${patient.age} years`);
    doc.text(`Blood Group: ${patient.bloodGroup}`);
    doc.text(`Contact: ${patient.phone}`);
    doc.moveDown();
    
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a237e').text('CONSULTATION DETAILS');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Doctor: ${consultation.doctorName}`);
    doc.text(`Specialization: ${doctor.specialization}`);
    doc.text(`Date: ${consultation.date}`);
    doc.text(`Token Number: ${consultation.token}`);
    doc.text(`Symptoms: ${consultation.symptoms}`);
    doc.moveDown();
    
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a237e').text('MEDICAL HISTORY');
    doc.fontSize(10).font('Helvetica');
    doc.text(patient.medicalHistory || 'No significant medical history');
    doc.moveDown();
    
    doc.strokeColor('#ccc').lineWidth(1).moveTo(50, doc.y + 20).lineTo(550, doc.y + 20).stroke();
    doc.fontSize(8).fillColor('#999').text('This is an official medical consultation report issued by DocEase Medical Center.', { align: 'center' });
    
    doc.end();
});

// ==================== ADMIN APIs ====================

app.get('/api/admin/stats', (req, res) => {
    const data = loadData();
    res.json({
        totalDoctors: data.doctors.length,
        totalPatients: data.patients.length,
        totalConsultations: data.completedConsultations.length
    });
});

app.get('/api/doctor/:doctorId/consultations', (req, res) => {
    const data = loadData();
    const consultations = data.completedConsultations.filter(c => c.doctorId === parseInt(req.params.doctorId));
    res.json(consultations);
});

app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('🏥 DOCEASE QUEUE MANAGEMENT SYSTEM');
    console.log('='.repeat(60));
    console.log(`✅ Server: http://localhost:${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
    console.log('='.repeat(60));
});