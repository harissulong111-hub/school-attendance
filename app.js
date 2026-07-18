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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore(); 
const auth = firebase.auth();

// =========================================================
// 2. ระบบควบคุมสิทธิ์ผู้ใช้งาน (Firebase Auth State Observer)
// =========================================================
let currentUserEmail = null;

auth.onAuthStateChanged((user) => {
    const loginOverlay = document.getElementById('login-overlay');
    const userNameBadge = document.getElementById('current-user-name');
    
    if (user) {
        currentUserEmail = user.email;
        if (loginOverlay) loginOverlay.classList.add('hidden');
        if (userNameBadge) userNameBadge.innerText = user.email;
        console.log("🔒 ยืนยันตัวตนสำเร็จโดยบัญชี:", user.email);
        
        setTimeout(() => {
            loadStudentMasterDataFromServer();
        }, 300);
    } else {
        currentUserEmail = null;
        if (loginOverlay) loginOverlay.classList.remove('hidden');
        if (userNameBadge) userNameBadge.innerText = "ไม่ได้เข้าสู่ระบบ";
        console.log("🔓 สถานะ: ไม่พบสิทธิ์เข้าใช้งานระบบ (กรุณาล็อกอิน)");
    }
});

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

function handleLogout() {
    if (confirm("คุณต้องการออกจากระบบการบันทึกสถิติตี้ใช่หรือไม่?")) {
        auth.signOut().then(() => {
            alert("🔒 ออกจากระบบเรียบร้อยแล้ว");
            document.getElementById('login-form').reset();
        });
    }
}

// =========================================================
// 3. ข้อมูลตั้งต้นและระบบสร้างตาราง 
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

let attendancePieChart = null;

const nowThailand = new Date();
const localYear = nowThailand.getFullYear();
const localMonth = String(nowThailand.getMonth() + 1).padStart(2, '0');
const localDay = String(nowThailand.getDate()).padStart(2, '0');
document.getElementById('record-date').value = `${localYear}-${localMonth}-${localDay}`;

function renderTable() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    tbody.innerHTML = ''; 

    classesList.forEach((cls) => {
        const defaultData = defaultStudentsData[cls] || { male: 0, female: 0 };
        const totalDefault = defaultData.male + defaultData.female;

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors';
        
        tr.innerHTML = `
            <td class="p-4 font-bold text-slate-700 dark:text-slate-200 text-center class-name-td">${cls}</td>
            <td class="p-4 text-center"><input type="number" value="${defaultData.male}" readonly class="w-16 bg-transparent text-center outline-none font-medium text-slate-500 dark:text-slate-400 cursor-not-allowed male-input"></td>
            <td class="p-4 text-center"><input type="number" value="${defaultData.female}" readonly class="w-16 bg-transparent text-center outline-none font-medium text-slate-500 dark:text-slate-400 cursor-not-allowed female-input"></td>
            <td class="p-4 text-center"><input type="number" value="${totalDefault}" readonly class="w-16 bg-transparent text-center outline-none font-bold text-slate-500 dark:text-slate-400 cursor-not-allowed total-input"></td>
            
            <td class="p-4 text-center"><input type="number" value="" placeholder="-" class="w-16 bg-blue-500/10 text-blue-500 border border-blue-500/30 rounded text-center font-bold male-present-input"></td>
            <td class="p-4 text-center"><input type="number" value="" placeholder="-" class="w-16 bg-pink-500/10 text-pink-500 border border-pink-500/30 rounded text-center font-bold female-present-input"></td>
            <td class="p-4 text-center"><input type="number" value="" placeholder="0" readonly class="w-16 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded text-center font-bold present-input cursor-not-allowed"></td>
            
            <td class="p-4 text-center"><input type="number" value="0" readonly class="w-16 bg-rose-500/10 text-rose-500 border border-rose-500/30 rounded text-center font-bold male-absent-input cursor-not-allowed"></td>
            <td class="p-4 text-center"><input type="number" value="0" readonly class="w-16 bg-rose-500/10 text-rose-500 border border-rose-500/30 rounded text-center font-bold female-absent-input cursor-not-allowed"></td>
            <td class="p-4 text-center"><input type="number" value="0" readonly class="w-16 bg-rose-500/10 text-rose-500 border border-rose-500/30 rounded text-center font-bold absent-input cursor-not-allowed"></td>
            
            <td class="p-4 text-right font-bold text-emerald-500 class-percentage">0.00%</td>
        `;
        tbody.appendChild(tr);
    });

    // 1. เพิ่มแถว "รวม" อัตโนมัติท้ายตารางรายชั้นเรียนบนหน้าเว็บ
    const totalTr = document.createElement('tr');
    totalTr.id = 'web-total-row';
    totalTr.className = 'bg-slate-100/60 dark:bg-slate-800/60 font-bold';
    totalTr.innerHTML = `
        <td class="p-4 text-center text-slate-900 dark:text-white font-black">รวม</td>
        <td class="p-4 text-center"><span id="sum-male">0</span></td>
        <td class="p-4 text-center"><span id="sum-female">0</span></td>
        <td class="p-4 text-center"><span id="sum-total">0</span></td>
        <td class="p-4 text-center text-blue-500"><span id="sum-male-present">0</span></td>
        <td class="p-4 text-center text-pink-500"><span id="sum-female-present">0</span></td>
        <td class="p-4 text-center text-emerald-500"><span id="sum-present">0</span></td>
        <td class="p-4 text-center text-rose-500"><span id="sum-male-absent">0</span></td>
        <td class="p-4 text-center text-rose-500"><span id="sum-female-absent">0</span></td>
        <td class="p-4 text-center text-rose-500"><span id="sum-absent">0</span></td>
        <td class="p-4 text-right text-emerald-500" id="sum-percentage">0.00%</td>
    `;
    tbody.appendChild(totalTr);

    document.querySelectorAll('#table-body input').forEach(input => {
        input.addEventListener('input', (e) => {
            const row = e.target.closest('tr');
            const male = parseInt(row.querySelector('.male-input').value) || 0;
            const female = parseInt(row.querySelector('.female-input').value) || 0;

            const malePresentInput = row.querySelector('.male-present-input').value;
            const femalePresentInput = row.querySelector('.female-present-input').value;

            const malePresent = malePresentInput !== "" ? parseInt(malePresentInput) || 0 : null;
            const femalePresent = femalePresentInput !== "" ? parseInt(femalePresentInput) || 0 : null;
            
            if (malePresent !== null) {
                let mAbsent = male - malePresent;
                row.querySelector('.male-absent-input').value = mAbsent < 0 ? 0 : mAbsent;
            } else {
                row.querySelector('.male-absent-input').value = 0;
            }

            if (femalePresent !== null) {
                let fAbsent = female - femalePresent;
                row.querySelector('.female-absent-input').value = fAbsent < 0 ? 0 : fAbsent;
            } else {
                row.querySelector('.female-absent-input').value = 0;
            }

            if (malePresent !== null || femalePresent !== null) {
                const calculatedSum = (malePresent || 0) + (femalePresent || 0);
                row.querySelector('.present-input').value = calculatedSum;
                
                const totalAbsent = (parseInt(row.querySelector('.male-absent-input').value) || 0) + (parseInt(row.querySelector('.female-absent-input').value) || 0);
                row.querySelector('.absent-input').value = totalAbsent;
            } else {
                row.querySelector('.present-input').value = "";
                row.querySelector('.absent-input').value = 0;
            }

            updateCalculations();
        });
    });

    updateCalculations(); 
}

function fillAllPresent() {
    const rows = document.querySelectorAll('#table-body tr');
    rows.forEach(row => {
        if (row.id === 'web-total-row' || row.id === 'print-extra-row') return;
        const male = parseInt(row.querySelector('.male-input').value) || 0;
        const female = parseInt(row.querySelector('.female-input').value) || 0;
        
        row.querySelector('.male-present-input').value = male;
        row.querySelector('.female-present-input').value = female;
        row.querySelector('.male-absent-input').value = 0;
        row.querySelector('.female-absent-input').value = 0;
        row.querySelector('.present-input').value = male + female;
        row.querySelector('.absent-input').value = 0;
    });
    updateCalculations();
}

// =========================================================
// 4. ระบบคำนวณสถิติและเปอร์เซ็นต์อัตโนมัติ
// =========================================================
function updateCalculations() {
    let grandTotalStudents = 0;
    let grandTotalMale = 0;
    let grandTotalFemale = 0;
    let grandPresent = 0;
    let grandAbsent = 0;
    let grandMaleAbsent = 0;
    let grandFemaleAbsent = 0;
    let grandMalePresent = 0;
    let grandFemalePresent = 0;

    const rows = document.querySelectorAll('#table-body tr');
    rows.forEach(row => {
        if (row.id === 'web-total-row' || row.id === 'print-extra-row') return;
        const male = parseInt(row.querySelector('.male-input').value) || 0;
        const female = parseInt(row.querySelector('.female-input').value) || 0;
        const present = parseInt(row.querySelector('.present-input').value) || 0;
        const absent = parseInt(row.querySelector('.absent-input').value) || 0;
        const maleAbsent = parseInt(row.querySelector('.male-absent-input').value) || 0;
        const femaleAbsent = parseInt(row.querySelector('.female-absent-input').value) || 0;
        
        const malePresent = parseInt(row.querySelector('.male-present-input').value) || 0;
        const femalePresent = parseInt(row.querySelector('.female-present-input').value) || 0;

        const totalClassStudents = male + female;
        grandTotalStudents += totalClassStudents;
        grandTotalMale += male;
        grandTotalFemale += female;
        grandPresent += present;
        grandAbsent += absent;
        grandMaleAbsent += maleAbsent;
        grandFemaleAbsent += femaleAbsent;
        grandMalePresent += malePresent;
        grandFemalePresent += femalePresent;

        const classPercent = totalClassStudents > 0 ? ((present / totalClassStudents) * 100).toFixed(2) : "0.00";
        const targetPercentEl = row.querySelector('.class-percentage');
        if (targetPercentEl) targetPercentEl.innerText = `${classPercent}%`;
    });

    // อัปเดตตัวเลขแถว "รวม" ท้ายตารางอัตโนมัติ
    if (document.getElementById('web-total-row')) {
        document.getElementById('sum-male').innerText = grandTotalMale;
        document.getElementById('sum-female').innerText = grandTotalFemale;
        document.getElementById('sum-total').innerText = grandTotalStudents;
        document.getElementById('sum-male-present').innerText = grandMalePresent;
        document.getElementById('sum-female-present').innerText = grandFemalePresent;
        document.getElementById('sum-present').innerText = grandPresent;
        document.getElementById('sum-male-absent').innerText = grandMaleAbsent;
        document.getElementById('sum-female-absent').innerText = grandFemaleAbsent;
        document.getElementById('sum-absent').innerText = grandAbsent;
        const totalPercentage = grandTotalStudents > 0 ? ((grandPresent / grandTotalStudents) * 100).toFixed(2) : "0.00";
        document.getElementById('sum-percentage').innerText = `${totalPercentage}%`;
    }

    const dashTotal = document.getElementById('dash-total');
    const dashPresent = document.getElementById('dash-present');
    const dashAbsent = document.getElementById('dash-absent');
    const dashMaleAbsent = document.getElementById('dash-male-absent');
    const dashFemaleAbsent = document.getElementById('dash-female-absent');

    if (dashTotal) dashTotal.innerHTML = `${grandTotalStudents} <span class="text-sm font-normal text-slate-400">คน</span>`;
    
    const totalPercentage = grandTotalStudents > 0 ? ((grandPresent / grandTotalStudents) * 100).toFixed(2) : "0.00";
    if (dashPresent) dashPresent.innerHTML = `${grandPresent} <span class="text-xs font-normal text-emerald-400">(${totalPercentage}%)</span>`;
    if (dashAbsent) dashAbsent.innerHTML = `${grandAbsent} <span class="text-sm font-normal text-slate-400">คน</span>`;
    
    const maleAbsentPercent = grandTotalMale > 0 ? ((grandMaleAbsent / grandTotalMale) * 100).toFixed(2) : "0.00";
    const femaleAbsentPercent = grandTotalFemale > 0 ? ((grandFemaleAbsent / grandTotalFemale) * 100).toFixed(2) : "0.00";
    
    if (dashMaleAbsent) dashMaleAbsent.innerHTML = `${grandMaleAbsent} <span class="text-xs font-normal text-rose-400">(${maleAbsentPercent}%)</span>`;
    if (dashFemaleAbsent) dashFemaleAbsent.innerHTML = `${grandFemaleAbsent} <span class="text-xs font-normal text-pink-400">(${femaleAbsentPercent}%)</span>`;

    updatePieChart(grandPresent, grandAbsent, 0, 0);
}

// =========================================================
// 5. ระบบบันทึกข้อมูลยิงขึ้นคลาวด์ออนไลน์ + ดีดรายงานเข้า LINE Bot
// =========================================================
function saveAttendanceData() {
    if (!currentUserEmail) {
        return alert("❌ ไม่สามารถบันทึกข้อมูลได้: สิทธิ์การล็อกอินหมดอายุหรือยังไม่ได้ลงชื่อเข้าใช้");
    }

    const targetDate = document.getElementById('record-date').value;
    if (!targetDate) return alert("กรุณาเลือกวันที่ก่อนบันทึกข้อมูลครับ");

    const currentTime = Date.now();
    const lastSaveTimestamp = localStorage.getItem(`cooldown_save_date_${targetDate}`);
    const cooldownPeriod = 60 * 1000; 

    if (lastSaveTimestamp) {
        const timeElapsed = currentTime - parseInt(lastSaveTimestamp);
        if (timeElapsed < cooldownPeriod) {
            const secondsRemaining = Math.ceil((cooldownPeriod - timeElapsed) / 1000);
            alert(`⚠️ คุณได้กดบันทึกข้อมูลลงระบบคลาวด์เรียบร้อยแล้ว\nจะกดบันทึกได้อีกครั้งในอีก ${secondsRemaining} วินาที`);
            return; 
        }
    }

    const dailyNote = document.getElementById('daily-note').value;

    const attendancePayload = {
        date: targetDate,
        submittedBy: currentUserEmail, 
        dailyNote: dailyNote || "",     
        classes: {},
        updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
    };

    let totalStudents = 0, present = 0, absent = 0;

    const rows = document.querySelectorAll('#table-body tr');
    rows.forEach(row => {
        if (row.id === 'web-total-row' || row.id === 'print-extra-row') return;
        const className = row.querySelector('.class-name-td').innerText;
        const male = parseInt(row.querySelector('.male-input').value) || 0;
        const female = parseInt(row.querySelector('.female-input').value) || 0;
        
        const malePresent = row.querySelector('.male-present-input').value !== "" ? parseInt(row.querySelector('.male-present-input').value) || 0 : "";
        const femalePresent = row.querySelector('.female-present-input').value !== "" ? parseInt(row.querySelector('.female-present-input').value) || 0 : "";
        
        const p = parseInt(row.querySelector('.present-input').value) || 0;
        const ab = parseInt(row.querySelector('.absent-input').value) || 0;

        totalStudents += (male + female);
        present += p;
        absent += ab;

        attendancePayload.classes[className] = { 
            male, 
            female, 
            malePresent, 
            femalePresent, 
            present: p, 
            absent: ab,
            leave: 0,
            late: 0
        };
    });

    attendancePayload.summary = {
        totalStudents,
        present,
        absent,
        leave: 0,
        late: 0,
        percentage: totalStudents > 0 ? parseFloat(((present / totalStudents) * 100).toFixed(2)) : 0
    };

    db.collection("attendance").doc(targetDate).set(attendancePayload)
        .then(() => {
            localStorage.setItem(`cooldown_save_date_${targetDate}`, Date.now().toString());

            const todayObj = new Date();
            const todayYear = todayObj.getFullYear();
            const todayMonth = String(todayObj.getMonth() + 1).padStart(2, '0');
            const todayDay = String(todayObj.getDate()).padStart(2, '0');
            const systemTodayStr = `${todayYear}-${todayMonth}-${todayDay}`;

            if (targetDate === systemTodayStr) {
                alert(`🎉 สำเร็จ! บันทึกข้อมูลของวันที่ ${targetDate} โดยครูผู้ดูแล (${currentUserEmail}) เข้าสู่คลาวด์แล้ว\n🚀 ระบบกำลังส่งรายงานเข้า LINE Bot อัตโนมัติ...`);
                
                const scriptUrl = "https://script.google.com/macros/s/AKfycbz3ZO2EYhEH8RzSxm_o5jL0lZcXQD-qM2Hm8kxBK_gHqTm4dQD_jynumuHs7YZ0H1F__w/exec";
                
                return fetch(scriptUrl, {
                    method: 'POST',
                    mode: 'no-cors', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(attendancePayload)
                });
            } else {
                alert(`🎉 สำเร็จ! ระบบทำการบันทึกข้อมูลสถิติตย้อนหลังประจำวันที่ ${targetDate} ลงฐานข้อมูลคลาวด์เรียบร้อยแล้ว\nℹ️ (หมายเหตุ: ไม่มีการส่งแจ้งเตือนซ้ำเข้าแอพ LINE เนื่องจากเป็นการลงประวัติย้อนหลัง)`);
                return null;
            }
        })
        .then((res) => {
            if (res !== null) {
                console.log("🔔 สัญญาณรายงานสถิติดีดผ่าน Webhook สู่ระบบกลุ่ม LINE สำเร็จเรียบร้อย!");
            }
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
                
                if (dailyNoteInput) {
                    dailyNoteInput.value = savedData.dailyNote || '';
                }

                const rows = document.querySelectorAll('#table-body tr');
                rows.forEach(row => {
                    if (row.id === 'web-total-row' || row.id === 'print-extra-row') return;
                    const className = row.querySelector('.class-name-td').innerText;
                    const classData = savedData.classes ? savedData.classes[className] : null;
                    if (classData) {
                        row.querySelector('.male-input').value = classData.male;
                        row.querySelector('.female-input').value = classData.female;
                        
                        const mTotal = parseInt(classData.male) || 0;
                        const fTotal = parseInt(classData.female) || 0;
                        row.querySelector('.total-input').value = mTotal + fTotal;

                        const mPresent = (classData.malePresent !== undefined) ? classData.malePresent : "";
                        const fPresent = (classData.femalePresent !== undefined) ? classData.femalePresent : "";
                        
                        row.querySelector('.male-present-input').value = mPresent;
                        row.querySelector('.female-present-input').value = fPresent;
                        
                        row.querySelector('.male-absent-input').value = mPresent !== "" ? (mTotal - parseInt(mPresent) || 0) : 0;
                        row.querySelector('.female-absent-input').value = fPresent !== "" ? (fTotal - parseInt(fPresent) || 0) : 0;
                        
                        row.querySelector('.present-input').value = classData.present;
                        row.querySelector('.absent-input').value = classData.absent;
                    }
                });
            } else {
                if (dailyNoteInput) dailyNoteInput.value = '';
                const rows = document.querySelectorAll('#table-body tr');
                rows.forEach(row => {
                    if (row.id === 'web-total-row' || row.id === 'print-extra-row') return;
                    const className = row.querySelector('.class-name-td').innerText;
                    const currentSetupData = defaultStudentsData[className] || { male: 0, female: 0 };
                    row.querySelector('.male-input').value = currentSetupData.male;
                    row.querySelector('.female-input').value = currentSetupData.female;
                    row.querySelector('.total-input').value = currentSetupData.male + currentSetupData.female;
                    
                    row.querySelector('.male-present-input').value = "";
                    row.querySelector('.female-present-input').value = "";
                    row.querySelector('.male-absent-input').value = 0;
                    row.querySelector('.female-absent-input').value = 0;
                    row.querySelector('.present-input').value = "";
                    row.querySelector('.absent-input').value = 0;
                });
            }
            updateCalculations();
        })
        .catch((error) => {
            console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", error);
        });
}

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
    const chartData = [present, absent];
    const totalSignals = present + absent;

    if (attendancePieChart) {
        attendancePieChart.data.datasets[0].data = totalSignals === 0 ? [1, 0] : chartData;
        attendancePieChart.update();
    } else {
        attendancePieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['มาเรียนจริง (คน)', 'รวมขาดเรียน (คน)'],
                datasets: [{
                    data: totalSignals === 0 ? [1, 0] : chartData,
                    backgroundColor: [
                        'rgba(16, 185, 129, 0.85)', 
                        'rgba(239, 68, 68, 0.85)'
                    ],
                    borderColor: [
                        '#10b981', '#ef4444'
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

            monthlyRecords.sort((a, b) => a.date.localeCompare(b.date));

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
                        <th>ร้อยละการมาเรียนรวมประจำวัน</th>
                        <th style="width: 250px;">หมายเหตุ / บันทึกประจำวัน</th>
                    </tr>
            `;

            let grandTotalStudentsSum = 0;
            let grandPresentAvgSum = 0;
            let grandAbsentAvgSum = 0;
            let totalDaysCount = monthlyRecords.length;

            monthlyRecords.forEach((record) => {
                const sum = record.summary || { totalStudents: 0, present: 0, absent: 0, percentage: 0 };
                
                grandTotalStudentsSum = sum.totalStudents; 
                grandPresentAvgSum += sum.present;
                grandAbsentAvgSum += sum.absent;

                excelTemplate += `
                    <tr>
                        <td style="mso-number-format:'\\@';">${record.date}</td>
                        <td>${sum.totalStudents}</td>
                        <td>${sum.present}</td>
                        <td>${sum.absent}</td>
                        <td style="color: #059669; font-weight: bold;">${sum.percentage}%</td>
                        <td style="text-align: left; mso-number-format:'\\@';">${record.dailyNote || '-'}</td>
                    </tr>
                `;
            });

            grandPresentAvgSum = grandPresentAvgSum / totalDaysCount;
            grandAbsentAvgSum = grandAbsentAvgSum / totalDaysCount;
            const totalPercentage = grandTotalStudentsSum > 0 ? ((grandPresentAvgSum / grandTotalStudentsSum) * 100).toFixed(2) : "0.00";

            excelTemplate += `
                    <tr class="sub-total">
                        <td>ค่าเฉลี่ยประจำเดือน</td>
                        <td>${grandTotalStudentsSum} คน (นร.ทั้งหมด)</td>
                        <td>${grandPresentAvgSum.toFixed(1)}</td>
                        <td>${grandAbsentAvgSum.toFixed(1)}</td>
                        <td style="color: #059669;">${totalPercentage}%</td>
                        <td>สรุปข้อมูลจากคลาวด์รวม ${totalDaysCount} วันทำการ</td>
                    </tr>
                </table>
                </body>
                </html>
            `;

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

// =========================================================
// 🟢 เมนูจัดการข้อมูลนักเรียนตั้งต้นผ่านหน้าเว็บ
// =========================================================
function openStudentMasterModal() {
    const container = document.getElementById('student-master-form-container');
    if (!container) return;
    container.innerHTML = '';

    classesList.forEach(cls => {
        const currentData = defaultStudentsData[cls] || { male: 0, female: 0 };
        const div = document.createElement('div');
        div.className = 'p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 rounded-2xl space-y-2';
        div.innerHTML = `
            <span class="text-xs font-black text-slate-700 dark:text-slate-300">${cls}</span>
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="block text-[10px] font-bold text-slate-400 mb-1">ชายทั้งหมด</label>
                    <input type="number" id="master-male-${cls}" value="${currentData.male}" min="0" required class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-2 text-center text-xs font-bold text-blue-500 outline-none focus:border-blue-500 shadow-sm">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-400 mb-1">หญิงทั้งหมด</label>
                    <input type="number" id="master-female-${cls}" value="${currentData.female}" min="0" required class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-2 text-center text-xs font-bold text-pink-500 outline-none focus:border-pink-500 shadow-sm">
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    document.getElementById('student-master-modal').classList.remove('hidden');
}

function closeStudentMasterModal() {
    document.getElementById('student-master-modal').classList.add('hidden');
}

function saveStudentMasterData(e) {
    e.preventDefault();
    if (!currentUserEmail) return alert("❌ กรุณาเข้าสู่ระบบก่อนดำเนินการ");

    const updatedMasterData = {};
    classesList.forEach(cls => {
        const m = parseInt(document.getElementById(`master-male-${cls}`).value) || 0;
        const f = parseInt(document.getElementById(`master-female-${cls}`).value) || 0;
        updatedMasterData[cls] = { male: m, female: f };
    });

    db.collection("attendance").doc("master_setup").set({
        defaultStudentsData: updatedMasterData,
        updatedBy: currentUserEmail,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        Object.assign(defaultStudentsData, updatedMasterData);
        alert("🟢 บันทึกข้อมูลนักเรียนตั้งต้นขึ้นระบบคลาวด์ และนำไปใช้คำนวณแอปพลิเคชันเรียบร้อยครับ!");
        closeStudentMasterModal();
        renderTable(); 
    })
    .catch(err => {
        console.error("Save Master Setup Error:", err);
        alert("❌ ไม่สามารถบันทึกข้อมูลลงระบบคลาวด์ได้เนื่องจากสิทธิ์เข้าถึงพอร์ตความปลอดภัย");
    });
}

function loadStudentMasterDataFromServer() {
    if (!auth.currentUser) {
        console.log("⚠️ รอกระบวนการเชื่อมต่อสิทธิ์สำเร็จก่อนเรียกอ่านฐานข้อมูล...");
        renderTable();
        return;
    }

    db.collection("attendance").doc("master_setup").get()
        .then(doc => {
            if (doc.exists) {
                const cloudMaster = doc.data().defaultStudentsData;
                if (cloudMaster) {
                    Object.assign(defaultStudentsData, cloudMaster);
                    console.log("☁️ Sync Master Data: ดึงยอดจำนวนนักเรียนปัจจุบันจากคลาวด์มาใช้งานสำเร็จ");
                }
            }
            renderTable(); 
            loadAttendanceData(); 
        })
        .catch(err => {
            console.error("Load Master Data Error (ใช้ค่าสแตนด์บายทดแทน):", err);
            renderTable();
            loadAttendanceData();
        });
}

function printBatchReportPDF() {
    const start = document.getElementById('print-start-date').value;
    const end = document.getElementById('print-end-date').value;
    const originalDate = document.getElementById('record-date').value; 

    if (!start || !end) {
        alert("❌ กรุณาระบุเลือกช่วงวันที่เริ่มต้นและสิ้นสุดที่ต้องการพิมพ์รายงานให้ครบถ้วนก่อนครับ");
        return;
    }
    if (new Date(start) > new Date(end)) {
        alert("⚠️ วันที่เริ่มต้นห้ามมากกว่าวันที่สิ้นสุด กรุณาเลือกช่วงเวลาใหม่อีกครั้งครับ");
        return;
    }

    alert("🔍 ระบบกำลังประมวลผลจัดหน้าพิมพ์รายงานแบบต่อเนื่อง กรุณารอสักครู่ครับ...");

    db.collection("attendance")
        .where("date", ">=", start)
        .where("date", "<=", end)
        .get()
        .then(async (querySnapshot) => {
            if (querySnapshot.empty) {
                alert(`ℹ️ ไม่พบแฟ้มข้อมูลบันทึกสถิติใดๆ ในระบบช่วงวันที่ ${start} ถึง ${end}`);
                return;
            }

            const records = [];
            querySnapshot.forEach((doc) => records.push(doc.data()));
            records.sort((a, b) => a.date.localeCompare(b.date));

            const virtualDeck = document.getElementById('batch-print-virtual-deck');
            const mainArea = document.getElementById('main-render-area');
            virtualDeck.innerHTML = ''; 

            for (let i = 0; i < records.length; i++) {
                const data = records[i];
                
                document.getElementById('record-date').value = data.date;
                updateThaiDateDisplay(data.date);
                if (document.getElementById('daily-note')) {
                    document.getElementById('daily-note').value = data.dailyNote || '';
                }

                classesList.forEach(cls => {
                    const classData = data.classes ? data.classes[cls] : null;
                    const rows = document.querySelectorAll('#table-body tr');
                    rows.forEach(row => {
                        if (row.id === 'web-total-row' || row.id === 'print-extra-row') return;
                        const currentClassName = row.querySelector('.class-name-td').innerText;
                        if (currentClassName === cls) {
                            if (classData) {
                                row.querySelector('.male-input').value = classData.male;
                                row.querySelector('.female-input').value = classData.female;
                                
                                const mTotal = parseInt(classData.male) || 0;
                                const fTotal = parseInt(classData.female) || 0;
                                row.querySelector('.total-input').value = mTotal + fTotal;
                                
                                const mPresent = (classData.malePresent !== undefined) ? classData.malePresent : "";
                                const fPresent = (classData.femalePresent !== undefined) ? classData.femalePresent : "";
                                
                                row.querySelector('.male-present-input').value = mPresent;
                                row.querySelector('.female-present-input').value = fPresent;
                                
                                row.querySelector('.male-absent-input').value = mPresent !== "" ? (mTotal - parseInt(mPresent) || 0) : 0;
                                row.querySelector('.female-absent-input').value = fPresent !== "" ? (fTotal - parseInt(fPresent) || 0) : 0;

                                row.querySelector('.present-input').value = classData.present;
                                row.querySelector('.absent-input').value = classData.absent;
                            }
                        }
                    });
                });
                
                updateCalculations();

                const clonePage = mainArea.cloneNode(true);
                clonePage.className = "batch-print-page";
                
                const originalInputs = mainArea.querySelectorAll('input');
                const clonedInputs = clonePage.querySelectorAll('input');
                originalInputs.forEach((input, index) => {
                    clonedInputs[index].value = input.value;
                });

                virtualDeck.appendChild(clonePage);
            }

            mainArea.style.display = 'none';
            virtualDeck.classList.remove('hidden');

            window.print();

            setTimeout(() => {
                virtualDeck.classList.add('hidden');
                virtualDeck.innerHTML = '';
                mainArea.style.display = 'block';
                
                document.getElementById('record-date').value = originalDate;
                updateThaiDateDisplay(originalDate);
                loadAttendanceData();
            }, 1000);
        })
        .catch((error) => {
            console.error("Batch Print Failure: ", error);
            alert("❌ ระบบขัดข้อง: ไม่สามารถประมวลผลพิมพ์รายงานแบบช่วงเวลาได้");
        });
}

renderTable();