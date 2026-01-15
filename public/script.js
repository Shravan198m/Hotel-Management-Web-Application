const api = '/api'; // Your backend API endpoint
const ADMIN_PASSWORD = 'admin'; // Hardcoded password for client-side demo

// DOM Elements
const adminLoginForm = document.getElementById('adminLoginForm');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');
const adminPasswordInput = document.getElementById('admin_password');
const adminLoginMsg = document.getElementById('adminLoginMsg');
const adminContent = document.getElementById('adminContent');
const roomsListDiv = document.getElementById('roomsList');
const bookingsListDiv = document.getElementById('bookingsList');
const roomSelectAdmin = document.getElementById('roomSelect'); // Admin booking form room select
const publicRoomSelect = document.getElementById('publicRoomSelect'); // Public booking form room select
const publicBookingForm = document.getElementById('publicBookingForm');
const publicBookingMsg = document.getElementById('publicBookingMsg');
const roomForm = document.getElementById('roomForm');
const bookingForm = document.getElementById('bookingForm'); // Admin booking form


/* ---------- Navigation Active State ---------- */
document.querySelectorAll('nav ul li a').forEach(link => {
    link.addEventListener('click', function() {
        // Remove active from all
        document.querySelectorAll('nav ul li a').forEach(nav => nav.classList.remove('active'));
        // Add active to clicked
        this.classList.add('active');
    });
});

/* ---------- Admin Login/Logout ---------- */
function checkAdminStatus() {
    const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true';
    if (isAdminLoggedIn) {
        adminContent.style.display = 'block';
        adminLogoutBtn.style.display = 'block';
        adminLoginForm.style.display = 'none';
        adminLoginMsg.innerHTML = '<span class="ok">Logged in as Admin.</span>';
        loadRooms(); // Load admin data if logged in
        loadBookings();
    } else {
        adminContent.style.display = 'none';
        adminLogoutBtn.style.display = 'none';
        adminLoginForm.style.display = 'block';
        adminLoginMsg.innerHTML = '';
        adminPasswordInput.value = ''; // Clear password field
    }
}

adminLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (adminPasswordInput.value === ADMIN_PASSWORD) {
        localStorage.setItem('isAdminLoggedIn', 'true');
        checkAdminStatus();
    } else {
        adminLoginMsg.innerHTML = '<span class="err">Incorrect password.</span>';
    }
});

adminLogoutBtn.addEventListener('click', () => {
    localStorage.removeItem('isAdminLoggedIn');
    checkAdminStatus();
    alert('Logged out from admin panel.');
});

/* ---------- Rooms UI (Admin Only) ---------- */
async function loadRooms() {
    // Only load if admin is logged in
    if (localStorage.getItem('isAdminLoggedIn') !== 'true') return;

    const res = await fetch(api + '/rooms');
    const rooms = await res.json();
    
    roomsListDiv.innerHTML = '';
    roomSelectAdmin.innerHTML = '<option value="">-- select available room --</option>'; // For admin booking form
    publicRoomSelect.innerHTML = '<option value="">-- select available room --</option>'; // For public booking form

    rooms.forEach(r => {
        const row = document.createElement('div');
        row.innerHTML = `<span><b>${r.room_number}</b> • ${r.type} • ₹${Number(r.price).toFixed(2)} • <i>${r.status}</i></span>
            <div>
                <button onclick="editRoom(${r.room_id})" class="edit-btn">Edit</button>
                <button onclick="deleteRoom(${r.room_id})" class="delete-btn">Delete</button>
            </div>`;
        roomsListDiv.appendChild(row);

        if (r.status === 'available') {
            const optAdmin = document.createElement('option');
            optAdmin.value = r.room_id;
            optAdmin.textContent = `${r.room_number} (${r.type}) — ₹${Number(r.price).toFixed(2)}`;
            roomSelectAdmin.appendChild(optAdmin);

            const optPublic = document.createElement('option');
            optPublic.value = r.room_id;
            optPublic.textContent = `${r.room_number} (${r.type}) — ₹${Number(r.price).toFixed(2)}`;
            publicRoomSelect.appendChild(optPublic);
        }
    });
}

async function editRoom(id) {
    const res = await fetch(api + '/rooms/' + id);
    const r = await res.json();
    document.getElementById('room_id').value = r.room_id;
    document.getElementById('room_number').value = r.room_number;
    document.getElementById('room_type').value = r.type;
    document.getElementById('room_price').value = r.price;
    document.getElementById('room_status').value = r.status;
    document.getElementById('room_desc').value = r.description || '';
    document.getElementById('roomMsg').innerHTML = ''; // Clear previous messages
    
    // Scroll to the form
    roomForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function deleteRoom(id) {
    if (!confirm('Delete this room?')) return;
    const res = await fetch(api + '/rooms/' + id, { method: 'DELETE' });
    if (res.ok) {
        document.getElementById('roomMsg').innerHTML = '<span class="ok">Deleted.</span>';
        loadRooms();
        loadBookings(); // Also reload bookings as a room might be deleted
    } else {
        const errorData = await res.json();
        document.getElementById('roomMsg').innerHTML = `<span class="err">Delete failed: ${errorData.error || 'Unknown error'}</span>`;
    }
}

roomForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('room_id').value;
    const payload = {
        room_number: document.getElementById('room_number').value.trim(),
        type: document.getElementById('room_type').value,
        price: Number(document.getElementById('room_price').value),
        status: document.getElementById('room_status').value,
        description: document.getElementById('room_desc').value.trim() || null
    };
    let res;
    if (id) res = await fetch(api + '/rooms/' + id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    else    res = await fetch(api + '/rooms',     { method:'POST',headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    
    if (res.ok) {
        document.getElementById('roomMsg').innerHTML = '<span class="ok">Saved.</span>';
        roomForm.reset();
        document.getElementById('room_id').value = ''; // Clear hidden ID
        loadRooms();
        loadBookings(); // Reload bookings too, in case status changed
    } else {
        const errorData = await res.json();
        document.getElementById('roomMsg').innerHTML = `<span class="err">Save failed: ${errorData.error || 'Unknown error'}</span>`;
    }
});

document.getElementById('roomClear').onclick = () => {
    roomForm.reset();
    document.getElementById('room_id').value = ''; // Ensure ID is cleared
    document.getElementById('roomMsg').innerHTML = '';
};

/* ---------- Bookings UI (Admin Only) ---------- */
async function loadBookings() {
    // Only load if admin is logged in
    if (localStorage.getItem('isAdminLoggedIn') !== 'true') return;

    const res = await fetch(api + '/bookings');
    const rows = await res.json();
    
    if (!rows.length) { bookingsListDiv.innerHTML = '<em>No bookings found.</em>'; return; }
    let html = '<table><tr><th>ID</th><th>Customer</th><th>Room</th><th>Dates</th><th>Amount</th><th>Status</th><th>Actions</th></tr>';
    rows.forEach(b => {
        html += `<tr>
            <td>${b.booking_id}</td>
            <td>${b.customer_name}</td>
            <td>${b.room_number} (${b.room_type})</td>
            <td>${b.check_in} &rarr; ${b.check_out}</td>
            <td>₹${Number(b.total_amount).toFixed(2)}</td>
            <td>${b.status}</td>
            <td>
                <button onclick="setStatus(${b.booking_id}, 'checked_in')" class="primary-btn">Check-In</button>
                <button onclick="setStatus(${b.booking_id}, 'checked_out')" class="secondary-btn">Check-Out</button>
                <button onclick="setStatus(${b.booking_id}, 'cancelled')" class="danger-btn">Cancel</button>
            </td>
        </tr>`;
    });
    html += '</table>';
    bookingsListDiv.innerHTML = html;
}

async function setStatus(id, status) {
    const res = await fetch(api + '/bookings/' + id + '/status', {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ status })
    });
    if (res.ok) {
        loadRooms(); // Reload rooms to update their status if checked out
        loadBookings();
    } else {
        const errorData = await res.json();
        alert(`Failed to update status: ${errorData.error || 'Unknown error'}`);
    }
}

/* ---------- Create Booking (Admin Form) ---------- */
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name  = document.getElementById('cust_name').value.trim();
    const email = document.getElementById('cust_email').value.trim();
    const phone = document.getElementById('cust_phone').value.trim();
    const city  = document.getElementById('cust_city').value.trim();
    const room_id = Number(document.getElementById('roomSelect').value);
    const check_in = document.getElementById('check_in').value;
    const check_out= document.getElementById('check_out').value;
    const total_amount = Number(document.getElementById('total_amount').value);

    const msg = document.getElementById('bookingMsg');
    msg.innerHTML = ''; // Clear previous messages

    if (!room_id) { msg.innerHTML = '<span class="err">Please choose a room.</span>'; return; }
    if (new Date(check_in) >= new Date(check_out)) { msg.innerHTML = '<span class="err">Check-out date must be after check-in date.</span>'; return; }

    // Create/get customer by email
    let customerId;
    try {
        const custRes = await fetch(api + '/customers', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ name, email, phone, city })
        });
        if (!custRes.ok) {
            const errorData = await custRes.json();
            throw new Error(errorData.error || 'Failed to create/get customer.');
        }
        const customer = await custRes.json();
        customerId = customer.customer_id;
    } catch (error) {
        msg.innerHTML = `<span class="err">${error.message}</span>`;
        return;
    }

    // Create booking
    try {
        const bookRes = await fetch(api + '/bookings', {
            method: 'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ customer_id: customerId, room_id, check_in, check_out, total_amount })
        });

        if (!bookRes.ok) {
            const err = await bookRes.json();
            throw new Error(err.error || 'Booking failed.');
        }
        const booking = await bookRes.json();
        msg.innerHTML = `<span class="ok">Booked! ID: ${booking.booking_id}</span>`;
        bookingForm.reset();
        loadRooms(); 
        loadBookings();
    } catch (error) {
        msg.innerHTML = `<span class="err">${error.message}</span>`;
    }
});


/* ---------- Public Facing Booking Form ---------- */
publicBookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name  = document.getElementById('public_cust_name').value.trim();
    const email = document.getElementById('public_cust_email').value.trim();
    const phone = document.getElementById('public_cust_phone').value.trim();
    const room_id = Number(document.getElementById('publicRoomSelect').value);
    const check_in = document.getElementById('public_check_in').value;
    const check_out= document.getElementById('public_check_out').value;
    const total_amount = Number(document.getElementById('public_total_amount').value);

    publicBookingMsg.innerHTML = ''; // Clear previous messages

    if (!room_id) { publicBookingMsg.innerHTML = '<span class="err">Please choose a room.</span>'; return; }
    if (new Date(check_in) >= new Date(check_out)) { publicBookingMsg.innerHTML = '<span class="err">Check-out date must be after check-in date.</span>'; return; }

    // Create/get customer (city can be null for public booking)
    let customerId;
    try {
        const custRes = await fetch(api + '/customers', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ name, email, phone, city: null })
        });
        if (!custRes.ok) {
            const errorData = await custRes.json();
            throw new Error(errorData.error || 'Failed to create/get customer for public booking.');
        }
        const customer = await custRes.json();
        customerId = customer.customer_id;
    } catch (error) {
        publicBookingMsg.innerHTML = `<span class="err">${error.message}</span>`;
        return;
    }

    // Create booking
    try {
        const bookRes = await fetch(api + '/bookings', {
            method: 'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ customer_id: customerId, room_id, check_in, check_out, total_amount })
        });

        if (!bookRes.ok) {
            const err = await bookRes.json();
            throw new Error(err.error || 'Public booking failed.');
        }
        const booking = await bookRes.json();
        publicBookingMsg.innerHTML = `<span class="ok">Your booking for Room ${booking.room_number} (ID: ${booking.booking_id}) is confirmed!</span>`;
        publicBookingForm.reset();
        loadRooms(); // Refresh rooms to update availability
    } catch (error) {
        publicBookingMsg.innerHTML = `<span class="err">${error.message}</span>`;
    }
});


// Initial page load
loadRooms(); // Always load rooms to populate public booking select
checkAdminStatus(); // Check admin login status on load