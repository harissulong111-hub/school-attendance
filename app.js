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
        // 🔒 เติม readonly และเปลี่ยนสไตล์ชั่วคราวให้ดูเหมือนข้อความธรรมดา เพื่อล็อกไม่ให้แก้ไขได้
        tr.innerHTML = `
            <td class="p-4 font-bold text-slate-700 dark:text-slate-200">${cls}</td>
            <td class="p-4"><input type="number" value="${defaultData.male}" readonly class="w-16 bg-transparent text-center outline-none font-medium text-slate-500 dark:text-slate-400 cursor-not-allowed male-input"></td>
            <td class="p-4"><input type="number" value="${defaultData.female}" readonly class="w-16 bg-transparent text-center outline-none font-medium text-slate-500 dark:text-slate-400 cursor-not-allowed female-input"></td>
            <td class="p-4"><input type="number" value="" placeholder="ว่าง" class="w-16 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded text-center font-bold present-input"></td>
            <td class="p-4"><input type="number" value="0" class="w-16 bg-rose-500/10 text-rose-500 border border-rose-500/30 rounded text-center absent-input"></td>
            <td class="p-4"><input type="number" value="0" class="w-16 bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded text-center leave-input"></td>
            <td class="p-4"><input type="number" value="0" class="w-16 bg-blue-500/10 text-blue-500 border border-blue-500/30 rounded text-center late-input"></td>
            <td class="p-4 text-right font-bold text-emerald-500 class-percentage">0.00%</td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('#table-body input').forEach(input => {
        input.addEventListener('input', (e) => {
            if (e.target.classList.contains('absent-input') || e.target.classList.contains('leave-input')) {
                const row = e.target.closest('tr');
                const male = parseInt(row.querySelector('.male-input').value) || 0;
                const female = parseInt(row.querySelector('.female-input').value) || 0;
                const absent = parseInt(row.querySelector('.absent-input').value) || 0;
                const leave = parseInt(row.querySelector('.leave-input').value) || 0;
                
                const total = male + female;
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
        const p = parseInt(row.querySelector('.present-input').value) || 0;
        const ab = parseInt(row.querySelector('.absent-input').value) || 0;
        const lv = parseInt(row.querySelector('.leave-input').value) || 0;
        const lt = parseInt(row.querySelector('.late-input').value) || 0;

        totalStudents += (male + female);
        present += p;
        absent += ab;
        leave += lv;
        late += lt;

        attendancePayload.classes[className] = { male, female, present: p, absent: ab, leave: lv, late: lt };
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
                        row.querySelector('.male-input').value = classData.male;
                        row.querySelector('.female-input').value = classData.female;
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
    
    const total = present + absent + leave + late;
    const chartData = total === 0 ? [1, 0, 0, 0] : [present, absent, leave, late];
    const chartLabels = total === 0 ? ['ไม่มีข้อมูล'] : ['มาเรียน', 'ขาดเรียน', 'ลาเรียน', 'มาสาย'];
    const chartColors = total === 0 ? ['#94a3b8'] : ['#10b981', '#f43f5e', '#f59e0b', '#38bdf8'];

    if (attendancePieChart) {
        attendancePieChart.data.labels = chartLabels;
        attendancePieChart.data.datasets[0].data = chartData;
        attendancePieChart.data.datasets[0].backgroundColor = chartColors;
        attendancePieChart.update();
    } else {
        attendancePieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: chartData,
                    backgroundColor: chartColors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            font: { family: 'sans-serif', size: 11 },
                            color: document.documentElement.classList.contains('dark') ? '#cbd5e1' : '#334155'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let val = context.raw || 0;
                                return ` ${context.label}: ${val} คน`;
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }
}

// ลงทะเบียน Event Listeners ของระบบหน้าบ้าน
document.getElementById('record-date').addEventListener('change', loadAttendanceData);

// รันฟังก์ชันวาดระบบครั้งแรก
renderTable();

// =========================================================
// ⚠️ 8. ฟังก์ชันพิเศษ: ล้างข้อมูลเก่าในคลาวด์เพื่อเริ่มใช้งานจริง
// =========================================================
function clearAllAttendanceData() {
    if (!currentUserEmail) {
        return alert("❌ ปฏิเสธการทำงาน: สิทธิ์เข้าใช้งานระบบถูกบล็อก กรุณาล็อกอินก่อนดำเนินการใดๆ");
    }

    const firstConfirm = confirm("⚠️ คุณแน่ใจใช่ไหมว่าต้องการ 'ลบข้อมูลสถิติทั้งหมด' ที่เคยบันทึกไว้ในฐานข้อมูลคลาวด์? \n\n(การกระทำนี้จะไม่สามารถย้อนคืนได้ ข้อมูลการทดสอบทั้งหมดจะหายไป)");
    
    if (firstConfirm) {
        const finalCheck = prompt("🔒 ระบบความปลอดภัยขั้นสูง:\nกรุณาพิมพ์คำว่า 'DELETE' (ตัวพิมพ์ใหญ่ทั้งหมด) เพื่อยืนยันการล้างฐานข้อมูลระบบ:");
        
        if (finalCheck === "DELETE") {
            alert("🚀 กำลังเชื่อมต่อคลาวด์เพื่อสั่งล้างฐานข้อมูลโปรดรอสักครู่...");
            
            db.collection("attendance").get()
                .then((querySnapshot) => {
                    if (querySnapshot.empty) {
                        alert("✨ ฐานข้อมูลว่างเปล่าอยู่แล้ว ไม่มีข้อมูลเก่าค้างในระบบครับ");
                        return;
                    }

                    const batch = db.batch();
                    querySnapshot.forEach((doc) => {
                        batch.delete(doc.ref);
                    });

                    return batch.commit();
                })
                .then(() => {
                    alert("🎉 สำเร็จ! ล้างข้อมูลสถิติเก่าออกจากระบบเรียบร้อยแล้ว ตอนนี้ฐานข้อมูลสะอาด 100% พร้อมเริ่มใช้งานจริงแล้วครับ");
                    window.location.reload();
                })
                .catch((error) => {
                    console.error("เกิดข้อผิดพลาดในการล้างข้อมูล:", error);
                    alert("❌ เกิดข้อผิดพลาด! ไม่สามารถลบข้อมูลได้เนื่องจากติดปัญหา Security Rules บนคลาวด์");
                });
        } else {
            alert("❌ ยกเลิกภารกิจ: คุณพิมพ์คำยืนยันไม่ถูกต้อง ระบบจึงล็อกไม่ให้เกิดการลบข้อมูลครับ");
        }
    }
}

// =========================================================
// 📊 9. เพิ่มเติม: ฟังก์ชันประมวลผลรายงานสถิติรายเดือน (เสนอ ผอ.)
// =========================================================
function generateMonthlyReport() {
    const selectedMonth = document.getElementById('report-month').value;
    if (!selectedMonth) {
        return alert("⚠️ กรุณาเลือกเดือนและปีที่ต้องการประมวลผลก่อนครับ");
    }

    // แยกปีและเดือนออกมา (เช่น "2026-03" -> ปี 2026, เดือน 03)
    const [year, month] = selectedMonth.split('-');
    
    // กำหนดวันเริ่มต้นและวันสิ้นสุดของเดือนเพื่อทำการ Query ช่วงข้อมูลจาก Firestore
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-31`; // Firestore เช็คค่า string range ครอบคลุมถึงสิ้นเดือนได้

    alert(`🔍 กำลังดึงข้อมูลและคำนวณสถิติของเดือน ${month}/${year} กรุณารอสักครู่...`);

    db.collection("attendance")
        .where("date", ">=", startDate)
        .where("date", "<=", endDate)
        .get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                alert(`❌ ไม่พบข้อมูลการบันทึกสถิติใดๆ ในเดือน ${month}/${year} บนระบบคลาวด์`);
                return;
            }

            // ตัวแปรโครงสร้างสำหรับเก็บผลรวมเพื่อหาค่าเฉลี่ย
            let totalDaysRecorded = querySnapshot.size;
            let monthlyClassData = {};

            // เตรียมโครงสร้างตั้งต้นสำหรับทุกชั้นเรียน
            classesList.forEach(cls => {
                monthlyClassData[cls] = { totalPresent: 0, totalAbsent: 0, totalLeave: 0, totalLate: 0 };
            });

            // วนลูปสะสมผลรวมสถิติจากทุกเอกสาร (ทุกวันที่บันทึก) ในเดือนนั้น
            querySnapshot.forEach((doc) => {
                const dayData = doc.data();
                if (dayData.classes) {
                    classesList.forEach((cls) => {
                        if (dayData.classes[cls]) {
                            monthlyClassData[cls].totalPresent += parseInt(dayData.classes[cls].present) || 0;
                            monthlyClassData[cls].totalAbsent += parseInt(dayData.classes[cls].absent) || 0;
                            monthlyClassData[cls].totalLeave += parseInt(dayData.classes[cls].leave) || 0;
                            monthlyClassData[cls].totalLate += parseInt(dayData.classes[cls].late) || 0;
                        }
                    });
                }
            });

            // นำค่าเฉลี่ยรายเดือนที่คณนาเสร็จแล้วไปสะท้อนผลลงบนตาราง (Table UI)
            const rows = document.querySelectorAll('#table-body tr');
            rows.forEach(row => {
                const className = row.cells[0].innerText;
                const classMonth = monthlyClassData[className];

                if (classMonth) {
                    // คำนวณค่าเฉลี่ยรายวัน (ปัดเศษทศนิยมให้สวยงาม)
                    const avgPresent = (classMonth.totalPresent / totalDaysRecorded).toFixed(1);
                    const avgAbsent = (classMonth.totalAbsent / totalDaysRecorded).toFixed(1);
                    const avgLeave = (classMonth.totalLeave / totalDaysRecorded).toFixed(1);
                    const avgLate = (classMonth.totalLate / totalDaysRecorded).toFixed(1);

                    // ยัดค่าลงในช่อง Input เพื่อให้ครูเห็นตัวเลขเฉลี่ยภาพรวมรายเดือน
                    row.querySelector('.present-input').value = avgPresent;
                    row.querySelector('.absent-input').value = avgAbsent;
                    row.querySelector('.leave-input').value = avgLeave;
                    row.querySelector('.late-input').value = avgLate;
                }
            });

            // อัปเดตการสะสมตัวเลขภาพรวมแดชบอร์ดและการวาดกราฟวงกลมประจำเดือน
            updateCalculations();
            
            // อัปเดตข้อความช่องหมายเหตุระบุว่าเป็นรายงานรายเดือน
            const dailyNoteInput = document.getElementById('daily-note');
            if (dailyNoteInput) {
                dailyNoteInput.value = `*** รายงานสถิติเฉลี่ยรายเดือน ประจำเดือน ${month}/${year} (คำนวณเฉลี่ยรวมจากข้อมูลทั้งหมด ${totalDaysRecorded} วันที่มีการบันทึก) ***`;
            }

            alert(`🎉 ประมวลผลสำเร็จ! ระบบได้คำนวณค่าเฉลี่ยสะสมตลอดทั้งเดือนรวม ${totalDaysRecorded} วันทำการเรียบร้อยแล้ว คุณครูสามารถสั่งพิมพ์รายงานเสนอ ผอ. ได้เลยครับ`);
        })
        .catch((error) => {
            console.error("เกิดข้อผิดพลาดในการประมวลผลรายเดือน:", error);
            alert("❌ ระบบขัดข้อง ไม่สามารถประมวลผลข้อมูลรายเดือนได้");
        });
}