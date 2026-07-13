// =========================================================
// 1. ส่วนเชื่อมต่อฐานข้อมูลออนไลน์ Firebase และ Authentication
// =========================================================
const firebaseConfig = {
  apiKey: "AIzaSyBZRq6svRTueE7vm1Nq_1HTc9XoF7md5dA",
  authDomain: "school-attendance-system-bb6fd.firebaseapp.com",
  projectId: "school-attendance-system-bb6fd",
  storageBucket: "school-attendance-system-bb6fd.firebasestorage.app",
  messagingSenderId: "759416871053",
  appId: "1:759416871053:web:b35232dbe27a952df12ac4",
  measurementId: "G-W4QSQND8KJ"
};

// ตรวจสอบการ Initialize แอปพลิเคชันป้องกัน Error ซ้ำซ้อน
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore(); 
const auth = firebase.auth(); // 🔐 เรียกใช้งานโมดูลระบบยืนยันตัวตน

// =========================================================
// 2. ระบบควบคุมสิทธิ์ผู้ใช้งาน (Firebase Auth State Observer)
// =========================================================
let currentUserEmail = null;

auth.onAuthStateChanged((user) => {
    const loginOverlay = document.getElementById('login-overlay');
    const userNameBadge = document.getElementById('current-user-name');
    
    if (user) {
        // กรณีผู้ใช้งานล็อกอินสำเร็จ
        currentUserEmail = user.email;
        if (loginOverlay) loginOverlay.classList.add('hidden'); // ซ่อนหน้าต่างล็อกอิน
        if (userNameBadge) userNameBadge.innerText = user.email; // แสดงอีเมลที่แถบบาร์บน
        console.log("🔒 ยืนยันตัวตนสำเร็จโดยบัญชี:", user.email);
        
        // โหลดข้อมูลของวันที่เลือกปัจจุบันทันทีหลังจากล็อกอินเสร็จ
        loadAttendanceData();
    } else {
        // กรณีไม่มีการเข้าสู่ระบบ หรือกด Logout ออกไป
        currentUserEmail = null;
        if (loginOverlay) loginOverlay.classList.remove('hidden'); // ดึงหน้าต่างล็อกอินขึ้นมาบัง
        if (userNameBadge) userNameBadge.innerText = "ไม่ได้เข้าสู่ระบบ";
        console.log("🔓 สถานะ: ไม่พบสิทธิ์เข้าใช้งานระบบ (กรุณาล็อกอิน)");
    }
});

// ฟังก์ชันสำหรับส่งคำขอตรวจสอบสิทธิ์ (Login)
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            alert("🔑 เข้าสู่ระบบสำเร็จ ยินดีต้อนรับเข้าสู่ระบบ E-Attendance ครับ");
        })
        .catch((error) => {
            console.error("Login Error:", error);
            alert("❌ รหัสผ่านไม่ถูกต้อง หรือ ไม่พบอีเมลผู้ใช้งานนี้ในระบบคลาวด์");
        });
}

// ฟังก์ชันออกจากระบบ (Logout)
function handleLogout() {
    if (confirm("คุณต้องการออกจากระบบการบันทึกสถิตินี้ใช่หรือไม่?")) {
        auth.signOut().then(() => {
            alert("🔒 ออกจากระบบเรียบร้อยแล้ว");
            document.getElementById('login-form').reset();
        });
    }
}

// =========================================================
// 3. ข้อมูลตั้งต้นและระบบสร้างตาราง (ล็อกจำนวนนักเรียนชาย-หญิง เป็นค่าคงที่)
// =========================================================
const classesList = ['อ.1', 'อ.2', 'อ.3', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'];

const defaultStudentsData = {
  'อ.1': { male: 2, female: 4 },
  'อ.2': { male: 0, female: 5 },
  'อ.3': { male: 7, female: 3 },
  'ป.1': { male: 7, female: 3 },
  'ป.2': { male: 8, female: 6 },
  'ป.3': { male: 3, female: 4 },
  'ป.4': { male: 8, female: 4 },
  'ป.5': { male: 5, female: 0 },
  'ป.6': { male: 6, female: 7 }
};

// ตัวแปรส่วนกลางสำหรับจัดเก็บ Instance ของกราฟวงกลม
let attendancePieChart = null;

document.getElementById('record-date').valueAsDate = new Date();

function renderTable() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    tbody.innerHTML = ''; 

    classesList.forEach((cls) => {
        const defaultData = defaultStudentsData[cls] || { male: 0, female: 0 };

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors';
        
        // 🛠️ ส่วนปรับปรุง: เพิ่มช่อง male-present และ female-present (มีค่าว่าง) และให้ช่อง present-input คำนวณบวกรวมอัตโนมัติ (readonly)
        tr.innerHTML = `
            <td class="p-4 font-bold text-slate-700 dark:text-slate-200">${cls}</td>
            <td class="p-4"><input type="number" value="${defaultData.male}" readonly class="w-16 bg-transparent text-center outline-none font-medium text-slate-500 dark:text-slate-400 cursor-not-allowed male-input"></td>
            <td class="p-4"><input type="number" value="${defaultData.female}" readonly class="w-16 bg-transparent text-center outline-none font-medium text-slate-500 dark:text-slate-400 cursor-not-allowed female-input"></td>
            <td class="p-4"><input type="number" value="" placeholder="ว่าง" class="w-16 bg-blue-500/10 text-blue-500 border border-blue-500/30 rounded text-center font-bold male-present-input"></td>
            <td class="p-4"><input type="number" value="" placeholder="ว่าง" class="w-16 bg-pink-500/10 text-pink-500 border border-pink-500/30 rounded text-center font-bold female-present-input"></td>
            <td class="p-4"><input type="number" value="" placeholder="0" readonly class="w-16 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded text-center font-bold present-input cursor-not-allowed"></td>
            <td class="p-4"><input type="number" value="0" class="w-16 bg-rose-500/10 text-rose-500 border border-rose-500/30 rounded text-center absent-input"></td>
            <td class="p-4"><input type="number" value="0" class="w-16 bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded text-center leave-input"></td>
            <td class="p-4"><input type="number" value="0" class="w-16 bg-blue-500/10 text-blue-500 border border-blue-500/30 rounded text-center late-input"></td>
            <td class="p-4 text-right font-bold text-emerald-500 class-percentage">0.00%</td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('#table-body input').forEach(input => {
        input.addEventListener('input', (e) => {
            const row = e.target.closest('tr');
            const male = parseInt(row.querySelector('.male-input').value) || 0;
            const female = parseInt(row.querySelector('.female-input').value) || 0;
            const total = male + female;

            // 🛠️ ส่วนปรับปรุงคำนวณอัตโนมัติ: ดึงยอดจาก ชายมา และ หญิงมา ไปใส่ให้ช่องรวมรวมนักเรียนมาวันนี้
            const malePresent = row.querySelector('.male-present-input').value !== "" ? parseInt(row.querySelector('.male-present-input').value) || 0 : null;
            const femalePresent = row.querySelector('.female-present-input').value !== "" ? parseInt(row.querySelector('.female-present-input').value) || 0 : null;
            
            if (malePresent !== null || femalePresent !== null) {
                const calculatedSum = (malePresent || 0) + (femalePresent || 0);
                row.querySelector('.present-input').value = calculatedSum;
                
                let calculatedAbsent = total - calculatedSum;
                row.querySelector('.absent-input').value = calculatedAbsent < 0 ? 0 : calculatedAbsent;
            } else {
                row.querySelector('.present-input').value = "";
                row.querySelector('.absent-input').value = "";
            }

            if (e.target.classList.contains('absent-input') || e.target.classList.contains('leave-input')) {
                const absent = parseInt(row.querySelector('.absent-input').value) || 0;
                const leave = parseInt(row.querySelector('.leave-input').value) || 0;
                const currentPresent = row.querySelector('.present-input').value;

                if (currentPresent !== "") {
                    let calculatedPresent = total - absent - leave;
                    row.querySelector('.present-input').value = calculatedPresent < 0 ? 0 : calculatedPresent;
                }
            }
            updateCalculations();
        });
    });

    updateCalculations(); 
}

function fillAllPresent() {
    const rows = document.querySelectorAll('#table-body tr');
    rows.forEach(row => {
        const male = parseInt(row.querySelector('.male-input').value) || 0;
        const female = parseInt(row.querySelector('.female-input').value) || 0;
        
        // 🛠️ ส่วนปรับปรุง: เมื่อกดปุ่มมาครบ ให้กระจายลงช่องชายมา-หญิงมาตามยอดทั้งหมดให้ด้วย
        row.querySelector('.male-present-input').value = male;
        row.querySelector('.female-present-input').value = female;
        row.querySelector('.present-input').value = male + female;
        row.querySelector('.absent-input').value = 0;
        row.querySelector('.leave-input').value = 0;
        row.querySelector('.late-input').value = 0;
    });
    updateCalculations();
}

// =========================================================
// 4. ระบบคำนวณสถิติและเปอร์เซ็นต์อัตโนมัติ
// =========================================================
function updateCalculations() {
    let grandTotalStudents = 0;
    let grandPresent = 0;
    let grandAbsent = 0;
    let grandLeave = 0;
    let grandLate = 0;

    const rows = document.querySelectorAll('#table-body tr');
    rows.forEach(row => {
        const male = parseInt(row.querySelector('.male-input').value) || 0;
        const female = parseInt(row.querySelector('.female-input').value) || 0;
        const present = parseInt(row.querySelector('.present-input').value) || 0;
        const absent = parseInt(row.querySelector('.absent-input').value) || 0;
        const leave = parseInt(row.querySelector('.leave-input').value) || 0;
        const late = parseInt(row.querySelector('.late-input').value) || 0;

        const totalClassStudents = male + female;
        grandTotalStudents += totalClassStudents;
        grandPresent += present;
        grandAbsent += absent;
        grandLeave += leave;
        grandLate += late;

        const classPercent = totalClassStudents > 0 ? ((present / totalClassStudents) * 100).toFixed(2) : "0.00";
        row.querySelector('.class-percentage').innerText = `${classPercent}%`;
    });

    const dashTotal = document.getElementById('dash-total');
    const dashPresent = document.getElementById('dash-present');
    const dashAbsent = document.getElementById('dash-absent');
    const dashLeave = document.getElementById('dash-leave');
    const dashLate = document.getElementById('dash-late');

    if (dashTotal) dashTotal.innerHTML = `${grandTotalStudents} <span class="text-sm font-normal text-slate-400">คน</span>`;
    
    const totalPercentage = grandTotalStudents > 0 ? ((grandPresent / grandTotalStudents) * 100).toFixed(2) : "0.00";
    if (dashPresent) dashPresent.innerHTML = `${grandPresent} <span class="text-xs font-normal text-emerald-400">(${totalPercentage}%)</span>`;
    if (dashAbsent) dashAbsent.innerHTML = `${grandAbsent} <span class="text-sm font-normal text-slate-400">คน</span>`;
    if (dashLeave) dashLeave.innerHTML = `${grandLeave} <span class="text-sm font-normal text-slate-400">คน</span>`;
    if (dashLate) dashLate.innerHTML = `${grandLate} <span class="text-sm font-normal text-slate-400">คน</span>`;

    // อัปเดตหน้าตาแผนภูมิวงกลมตามตัวเลขชุดใหม่ล่าสุด
    updatePieChart(grandPresent, grandAbsent, grandLeave, grandLate);
}

// =========================================================
// 5. ระบบบันทึกข้อมูลยิงขึ้นคลาวด์ออนไลน์ + ดีดรายงานเข้า LINE Bot
// =========================================================
function saveAttendanceData() {
    // ป้องกันกรณีที่กดปุ่มเซฟแต่ไม่มีเซสชันเข้าสู่ระบบไว้
    if (!currentUserEmail) {
        return alert("❌ ไม่สามารถบันทึกข้อมูลได้: สิทธิ์การล็อกอินหมดอายุหรือยังไม่ได้ลงชื่อเข้าใช้");
    }

    const targetDate = document.getElementById('record-date').value;
    if (!targetDate) return alert("กรุณาเลือกวันที่ก่อนบันทึกข้อมูลครับ");

    // ⏳ [ระบบเพิ่มใหม่]: ตรวจสอบสิทธิ์การกดซ้ำซ้อนภายในระยะเวลา 1 นาที (Cooldown 60 วินาที) แยกตามวันที่เลือก
    const currentTime = Date.now();
    const lastSaveTimestamp = localStorage.getItem(`cooldown_save_date_${targetDate}`);
    const cooldownPeriod = 60 * 1000; // 1 นาที ในรูปแบบมิลลิวินาที

    if (lastSaveTimestamp) {
        const timeElapsed = currentTime - parseInt(lastSaveTimestamp);
        if (timeElapsed < cooldownPeriod) {
            const secondsRemaining = Math.ceil((cooldownPeriod - timeElapsed) / 1000);
            // แสดงหน้าต่างข้อความขนาดใหญ่แจ้งเตือนอย่างเด่นชัด
            alert(`⚠️ คุณได้กดบันทึกข้อมูลลงระบบคลาวด์เรียบร้อยแล้ว\nจะกดบันทึกได้อีกครั้งในอีก ${secondsRemaining} วินาที`);
            return; // ล็อกและตัดกระบวนการทันทีเพื่อไม่ให้ Firebase บันทึกซ้ำ และ LINE ไม่แจ้งเตือนซ้ำ
        }
    }

    // รับข้อมูลจากช่องหมายเหตุประจำวัน
    const dailyNote = document.getElementById('daily-note').value;

    const attendancePayload = {
        date: targetDate,
        submittedBy: currentUserEmail, // บันทึกอีเมลครูผู้กดส่งข้อมูลอัตโนมัติ
        dailyNote: dailyNote || "",     // เก็บข้อมูลช่องหมายเหตุประจำวันลงระบบ
        classes: {},
        updatedAt: firebase.firestore.FieldValue.serverTimestamp() // ใส่ Timestamp เวลาเซฟจริง
    };

    let totalStudents = 0, present = 0, absent = 0, leave = 0, late = 0;

    const rows = document.querySelectorAll('#table-body tr');
    rows.forEach(row => {
        const className = row.cells[0].innerText;
        const male = parseInt(row.querySelector('.male-input').value) || 0;
        const female = parseInt(row.querySelector('.female-input').value) || 0;
        
        // 🛠️ ส่วนปรับปรุง payload: ดึงค่าชายมา-หญิงมาเพิ่มเข้าไปในก้อนชุดข้อมูลเก็บลงคลาวด์
        const malePresent = row.querySelector('.male-present-input').value !== "" ? parseInt(row.querySelector('.male-present-input').value) || 0 : "";
        const femalePresent = row.querySelector('.female-present-input').value !== "" ? parseInt(row.querySelector('.female-present-input').value) || 0 : "";
        
        const p = parseInt(row.querySelector('.present-input').value) || 0;
        const ab = parseInt(row.querySelector('.absent-input').value) || 0;
        const lv = parseInt(row.querySelector('.leave-input').value) || 0;
        const lt = parseInt(row.querySelector('.late-input').value) || 0;

        totalStudents += (male + female);
        present += p;
        absent += ab;
        leave += lv;
        late += lt;

        attendancePayload.classes[className] = { 
            male, 
            female, 
            malePresent, 
            femalePresent, 
            present: p, 
            absent: ab, 
            leave: lv, 
            late: lt 
        };
    });

    attendancePayload.summary = {
        totalStudents,
        present,
        absent,
        leave,
        late,
        percentage: totalStudents > 0 ? parseFloat(((present / totalStudents) * 100).toFixed(2)) : 0
    };

    db.collection("attendance").doc(targetDate).set(attendancePayload)
        .then(() => {
            // 💾 บันทึกเวลาปัจจุบันลงในความจำเครื่องสำเร็จเพื่อตั้ง Cooldown ล็อกการทำงานซ้ำใน 1 นาที
            localStorage.setItem(`cooldown_save_date_${targetDate}`, Date.now().toString());

            alert(`🎉 สำเร็จ! บันทึกข้อมูลของวันที่ ${targetDate} โดยครูผู้ดูแล (${currentUserEmail}) เข้าสู่คลาวด์แล้ว\n🚀 ระบบกำลังส่งรายงานเข้า LINE Bot อัตโนมัติ...`);
            
            // 🌐 เชื่อมต่อสะพานข้อมูล Google Apps Script Webhook API ของคุณครู
            const scriptUrl = "https://script.google.com/macros/s/AKfycbzOscwe8dGsjsljxKYqJy-cE0ikaWryIm6ASr1FJohOgVrdsCOAFF7gofSuZo1tQdh4/exec";
            
            return fetch(scriptUrl, {
                method: 'POST',
                mode: 'no-cors', // สั่ง Bypass ปัญหา CORS ทะลุกำแพงเบราว์เซอร์อย่างปลอดภัย
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(attendancePayload)
            });
        })
        .then(() => {
            console.log("🔔 สัญญาณรายงานสถิติดีดผ่าน Webhook สู่ระบบกลุ่ม LINE สำเร็จเรียบร้อย!");
        })
        .catch((error) => {
            console.error("เกิดข้อผิดพลาดในการบันทึก:", error);
            alert("❌ ไม่สามารถบันทึกข้อมูลได้ กรุณาตรวจสอบสิทธิ์การเขียนอ่าน (Rules) บน Firebase Firestore");
        });
}

// ระบบสลับธีม Dark Mode / Light Mode
function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    document.getElementById('theme-icon').className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

// =========================================================
// 6. ระบบดึงข้อมูลอัตโนมัติเมื่อมีการเปลี่ยนวันที่ (Auto Load Data)
// =========================================================
function loadAttendanceData() {
    const targetDate = document.getElementById('record-date').value;
    if (!targetDate) return;

    db.collection("attendance").doc(targetDate).get()
        .then((doc) => {
            const dailyNoteInput = document.getElementById('daily-note');
            if (doc.exists) {
                const savedData = doc.data();
                console.log(`📥 เจอข้อมูลเก่าของวันที่ ${targetDate}:`, savedData);
                
                // แสดงข้อความหมายเหตุที่บันทึกไว้คืนมาที่ฟิลด์อินพุต
                if (dailyNoteInput) {
                    dailyNoteInput.value = savedData.dailyNote || '';
                }

                const rows = document.querySelectorAll('#table-body tr');
                rows.forEach(row => {
                    const className = row.cells[0].innerText;
                    const classData = savedData.classes ? savedData.classes[className] : null;
                    if (classData) {
                        // 🛠 *ส่วนที่แก้ไขเพิ่มเติม*: ดึงค่า ชายมา-หญิงมา กลับมาแสดงผลคืนบนตารางกรณีมีข้อมูลเก่า
                        row.querySelector('.male-input').value = classData.male;
                        row.querySelector('.female-input').value = classData.female;
                        row.querySelector('.male-present-input').value = (classData.malePresent !== undefined) ? classData.malePresent : "";
                        row.querySelector('.female-present-input').value = (classData.femalePresent !== undefined) ? classData.femalePresent : "";
                        row.querySelector('.present-input').value = classData.present;
                        row.querySelector('.absent-input').value = classData.absent;
                        row.querySelector('.leave-input').value = classData.leave;
                        row.querySelector('.late-input').value = classData.late;
                    }
                });
            } else {
                // หากไม่เจอข้อมูลเดิมของวันนั้นๆ ให้เคลียร์ข้อมูลเป็นค่าดีฟอลต์ทั้งหมด
                if (dailyNoteInput) dailyNoteInput.value = '';
                const rows = document.querySelectorAll('#table-body tr');
                rows.forEach(row => {
                    const className = row.cells[0].innerText;
                    const defaultData = defaultStudentsData[className] || { male: 0, female: 0 };
                    row.querySelector('.male-input').value = defaultData.male;
                    row.querySelector('.female-input').value = defaultData.female;
                    
                    // เคลียร์ค่าว่างในฟิลด์บันทึกมาเรียนชุดใหม่
                    row.querySelector('.male-present-input').value = "";
                    row.querySelector('.female-present-input').value = "";
                    row.querySelector('.present-input').value = "";
                    row.querySelector('.absent-input').value = 0;
                    row.querySelector('.leave-input').value = 0;
                    row.querySelector('.late-input').value = 0;
                });
            }
            updateCalculations();
        })
        .catch((error) => {
            console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", error);
        });
}

// 🖨️ ฟังก์ชันเปิดหน้าต่างพิมพ์รายงาน
function printReport() {
    window.print();
}

// =========================================================
// 📊 7. ระบบแผนภูมิวงกลมสรุปสถิติ (Chart.js Integration)
// =========================================================
function updatePieChart(present, absent, leave, late) {
    const canvasElement = document.getElementById('attendanceChart');
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    const chartData = [present, absent, leave, late];
    
    // ตรวจสอบความพร้อม หากมียอดรวมเป็น 0 ให้สร้างสัดส่วนจำลองเพื่อป้องกัน Chart.js Error หน้าจอค้าง
    const totalSignals = present + absent + leave + late;

    if (attendancePieChart) {
        // หากเคยอินิทกราฟไว้แล้ว ให้สลับชุดตัวเลขเพื่อแอนิเมชันที่สวยงาม
        attendancePieChart.data.datasets[0].data = totalSignals === 0 ? [1, 0, 0, 0] : chartData;
        attendancePieChart.update();
    } else {
        // ขั้นตอนการสร้าง Instance ใหม่ลงบน Context Canvas ครั้งแรก
        attendancePieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['มาเรียนจริง (คน)', 'ขาดเรียน (คน)', 'ลาเรียน (คน)', 'มาสาย (คน)'],
                datasets: [{
                    data: totalSignals === 0 ? [1, 0, 0, 0] : chartData,
                    backgroundColor: [
                        'rgba(16, 185, 129, 0.85)', // Emerald 500
                        'rgba(239, 68, 68, 0.85)',   // Rose 500
                        'rgba(245, 158, 11, 0.85)',  // Amber 500
                        'rgba(59, 130, 246, 0.85)'   // Blue 500
                    ],
                    borderColor: [
                        '#10b981', '#ef4444', '#f59e0b', '#3b82f6'
                    ],
                    borderWidth: 2,
                    hoverOffset: 12
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { family: 'Noto Sans Thai', size: 12, weight: '500' },
                            padding: 18,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (totalSignals === 0 && context.dataIndex === 0) {
                                    return " ไม่มีข้อมูลจัดเก็บประจำวันนี้";
                                }
                                return ` จำนวน: ${context.raw} คน`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// =========================================================
// 🚀 8. ฟังก์ชันประมวลผลดึงดาต้าเบสเพื่อแปลงส่งออกเป็นสเปรดชีต Excel รายเดือน (.xls)
// =========================================================
function exportMonthlyReportToExcel() {
    const targetDate = document.getElementById('record-date').value;
    if (!targetDate) return alert("❌ ไม่สามารถประมวลผลได้: กรุณาเลือกวันที่บนปฏิทินเพื่อระบุเดือนที่ต้องการส่งออก");

    const dateParts = targetDate.split('-');
    const year = dateParts[0];
    const month = dateParts[1]; 

    const startOfMonth = `${year}-${month}-01`;
    const endOfMonth = `${year}-${month}-31`; 

    db.collection("attendance")
        .where("date", ">=", startOfMonth)
        .where("date", "<=", endOfMonth)
        .get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                return alert(`📭 ไม่พบฐานข้อมูลสถิติมาเรียนใดๆ ในช่วงเดือน ${month}/${year} บนระบบคลาวด์ครับ`);
            }

            let monthlyRecords = [];
            querySnapshot.forEach((doc) => {
                monthlyRecords.push(doc.data());
            });

            // จัดเรียงวันที่จากน้อยไปมาก
            monthlyRecords.sort((a, b) => a.date.localeCompare(b.date));

            // โครงสร้างหัวรายงานตาราง Excel สไตล์มาตรฐานราชการไทย
            let excelTemplate = `
                <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
                <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: 'Khmer OS Battambang', 'Angsana New', sans-serif; }
                    table { border-collapse: collapse; width: 100%; }
                    th { background-color: #f1f5f9; color: #1e293b; border: 1px solid #cbd5e1; padding: 10px; font-weight: bold; text-align: center; }
                    td { border: 1px solid #cbd5e1; padding: 8px; text-align: center; }
                    .header-title { font-size: 18px; font-weight: bold; text-align: center; padding: 15px 0; }
                    .sub-total { background-color: #f8fafc; font-weight: bold; }
                </style>
                </head>
                <body>
                <div class="header-title">รายงานสรุปข้อมูลสถิติการมาเรียน โรงเรียนบ้านกาหยี ประจำเดือน  ${month}/${year}</div>
                <table>
                    <tr>
                        <th style="width: 140px;">วันที่บันทึก</th>
                        <th>นักเรียนทั้งหมด (คน)</th>
                        <th>มาเรียนรวม (คน)</th>
                        <th>ขาดเรียนรวม (คน)</th>
                        <th>ลาเรียนรวม (คน)</th>
                        <th>มาสายรวม (คน)</th>
                        <th>ร้อยละการมาเรียนรวมประจำวัน</th>
                        <th style="width: 250px;">หมายเหตุ / บันทึกประจำวัน</th>
                    </tr>
            `;

            let grandTotalStudentsSum = 0;
            let grandPresentAvgSum = 0;
            let grandAbsentAvgSum = 0;
            let grandLeaveAvgSum = 0;
            let grandLateAvgSum = 0;
            let totalDaysCount = monthlyRecords.length;

            monthlyRecords.forEach((record) => {
                const sum = record.summary || { totalStudents: 0, present: 0, absent: 0, leave: 0, late: 0, percentage: 0 };
                
                grandTotalStudentsSum = sum.totalStudents; // คงที่ตามจำนวนเด็กรวม
                grandPresentAvgSum += sum.present;
                grandAbsentAvgSum += sum.absent;
                grandLeaveAvgSum += sum.leave;
                grandLateAvgSum += sum.late;

                excelTemplate += `
                    <tr>
                        <td style="mso-number-format:'\\@';">${record.date}</td>
                        <td>${sum.totalStudents}</td>
                        <td>${sum.present}</td>
                        <td>${sum.absent}</td>
                        <td>${sum.leave}</td>
                        <td>${sum.late}</td>
                        <td style="color: #059669; font-weight: bold;">${sum.percentage}%</td>
                        <td style="text-align: left; mso-number-format:'\\@';">${record.dailyNote || '-'}</td>
                    </tr>
                `;
            });

            // คำนวณหาค่าเฉลี่ยสะสมประจำเดือนเพื่อปิดท้ายตารางให้สมบูรณ์
            grandPresentAvgSum = grandPresentAvgSum / totalDaysCount;
            grandAbsentAvgSum = grandAbsentAvgSum / totalDaysCount;
            grandLeaveAvgSum = grandLeaveAvgSum / totalDaysCount;
            grandLateAvgSum = grandLateAvgSum / totalDaysCount;
            const totalPercentage = grandTotalStudentsSum > 0 ? ((grandPresentAvgSum / grandTotalStudentsSum) * 100).toFixed(2) : "0.00";

            excelTemplate += `
                    <tr class="sub-total">
                        <td>ค่าเฉลี่ยประจำเดือน</td>
                        <td>${grandTotalStudentsSum} คน (นร.ทั้งหมด)</td>
                        <td>${grandPresentAvgSum.toFixed(1)}</td>
                        <td>${grandAbsentAvgSum.toFixed(1)}</td>
                        <td>${grandLeaveAvgSum.toFixed(1)}</td>
                        <td>${grandLateAvgSum.toFixed(1)}</td>
                        <td style="color: #059669;">${totalPercentage}%</td>
                        <td>สรุปข้อมูลจากคลาวด์รวม ${totalDaysCount} วันทำทำการ</td>
                    </tr>
                </table>
                </body>
                </html>
            `;

            // 💾 กระบวนการทำ Data Stream ดาวน์โหลดไฟล์ออกไปนอกระบบคอมพิวเตอร์
            const blob = new Blob([excelTemplate], { type: "application/vnd.ms-excel;charset=utf-8;" });
            const link = document.createElement("a");
            const fileName = `รายงานสถิติมาเรียน_${month}_${year}.xls`;

            if (navigator.msSaveBlob) { 
                navigator.msSaveBlob(blob, fileName);
            } else {
                link.href = URL.createObjectURL(blob);
                link.style.visibility = 'hidden';
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            console.log(`🟢 สั่งเจาะไฟล์และส่งออกสเปรดชีต Excel สำเร็จ: ${fileName}`);
        })
        .catch((error) => {
            console.error("Excel Export Error:", error);
            alert("❌ ระบบขัดข้อง ไม่สามารถดึงฐานข้อมูลเพื่อส่งออกไฟล์ Excel ได้");
        });
}

// 🎬 เรียกการทำงานวาดตารางและเรนเดอร์ UI ทันทีที่เครื่องเบราว์เซอร์เปิดแอปสำเร็จ
renderTable();