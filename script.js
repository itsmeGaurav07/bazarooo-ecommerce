// --- I. GLOBAL PAGE STATE MANAGEMENT & CONSTANTS ---
const AUTH_PAGE = 'auth-page-container';
const ADMIN_LOGIN_MODAL_ID = 'admin-login-modal-container';
const STORE_PAGE = 'store-page-container';
const PRODUCT_DETAIL_PAGE = 'product-detail-container';
const CHECKOUT_PAGE = 'checkout-page-container';
const MY_ORDERS_PAGE = 'my-orders-page-container';
const ADMIN_DASHBOARD_URL = 'admin_dashboard.html';
const SEARCH_RESULTS_PAGE = 'search-results-page-container';

const pageContainers = {
    [AUTH_PAGE]: document.getElementById(AUTH_PAGE),
    [STORE_PAGE]: document.getElementById(STORE_PAGE),
    [PRODUCT_DETAIL_PAGE]: document.getElementById(PRODUCT_DETAIL_PAGE),
    [CHECKOUT_PAGE]: document.getElementById(CHECKOUT_PAGE),
    [MY_ORDERS_PAGE]: document.getElementById(MY_ORDERS_PAGE),
    [SEARCH_RESULTS_PAGE]: document.getElementById(SEARCH_RESULTS_PAGE)
};
const adminLoginModalEl = document.getElementById(ADMIN_LOGIN_MODAL_ID);

let isAdminLoggedIn = false;
let firebaseCurrentUser = null;
let currentUserUsernameForDisplay = null;

const ADMIN_USERNAME = "team techvision";
const ADMIN_PASSWORD = "gstkpv";
const ADMIN_LOGIN_HASH = "#admin-login";
const ORDERS_STORAGE_KEY = 'alltronics_admin_dashboard_orders';

// --- Variables for Image Zoom Modal ---
let imageZoomModal, zoomedImage;
let closeZoomModalBtn, zoomInImageBtn, zoomOutImageBtn, zoomResetImageBtn, zoomModalContent;

let currentZoomLevel = 1;
const ZOOM_STEP = 0.2;
const CLICK_ZOOM_LEVEL = 2;
const MAX_ZOOM = 3;
const MIN_ZOOM = 0.5;
let isPanning = false;
let panStartX, panStartY, imgStartLeft, imgStartTop;
// --- End Variables for Image Zoom Modal ---

// --- FIREBASE SETUP ---
const firebaseConfig = {
  apiKey: "AIzaSyBNAn4DVnkT2NbSotifPJGPpbqb5Jfw8vw",
  authDomain: "the-store-e8990.firebaseapp.com",
  projectId: "the-store-e8990",
  storageBucket: "the-store-e8990.firebasestorage.app",
  messagingSenderId: "872334553892",
  appId: "1:872334553892:web:7a14c9a95559c5ae5979b1",
  measurementId: "G-N0B35J7RLY"
};

let firebaseApp;
let auth;
let db;

try {
    if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(firebaseConfig);
    } else {
        firebaseApp = firebase.app();
    }
    auth = firebase.auth();
    db = firebase.firestore();
} catch (error) {
    console.error("CRITICAL FIREBASE INIT ERROR:", error);
    alert("CRITICAL FIREBASE INIT ERROR: Firebase could not be initialized. Check console. Error: " + error.message);
}

// --- Product Data ---
let productsData = {};

// --- Cart ---
let cart = {};
function loadTempCart() {
    const tempCartData = localStorage.getItem('temp_app_cart');
    try { cart = tempCartData ? JSON.parse(tempCartData) : {}; }
    catch(e) { console.error("Error parsing temp_app_cart", e); cart = {}; }
    updateCartUI();
}
function saveTempCart() {
    try { localStorage.setItem('temp_app_cart', JSON.stringify(cart)); }
    catch (e) { console.error("Error saving temp_app_cart", e); }
}

// --- Main Page View Switching Logic ---
function switchView(targetViewId) {
    try {
        Object.values(pageContainers).forEach(container => { if (container) container.style.display = 'none'; });
        const newAuthActualContainer = document.getElementById('newAuthActualContainer');
        if (newAuthActualContainer) newAuthActualContainer.style.display = 'none';
        if (adminLoginModalEl) adminLoginModalEl.style.display = 'none';
        const storeHeaderEl = document.getElementById('main-store-header');
        const myOrdersHeaderEl = document.getElementById('my-orders-header');
        if (storeHeaderEl) storeHeaderEl.style.display = 'none';
        if (myOrdersHeaderEl) myOrdersHeaderEl.style.display = 'none';

        if (pageContainers[targetViewId]) {
            pageContainers[targetViewId].style.display = (targetViewId === AUTH_PAGE) ? 'flex' : 'block';
            if (targetViewId === AUTH_PAGE && newAuthActualContainer) { newAuthActualContainer.style.display = ''; }
            if ([STORE_PAGE, PRODUCT_DETAIL_PAGE, CHECKOUT_PAGE].includes(targetViewId)) { if(storeHeaderEl) storeHeaderEl.style.display = 'flex'; }
            else if (targetViewId === MY_ORDERS_PAGE) { if(myOrdersHeaderEl) myOrdersHeaderEl.style.display = 'flex'; }
        } else {
            console.error("ERROR: Target view container NOT FOUND for:", targetViewId);
            if (pageContainers[AUTH_PAGE]) pageContainers[AUTH_PAGE].style.display = 'flex';
            if (newAuthActualContainer) newAuthActualContainer.style.display = '';
        }
        document.documentElement.className = ''; document.body.className = '';
        if (targetViewId === AUTH_PAGE) { document.documentElement.classList.add('auth-active'); document.body.classList.add('auth-active'); if (newAuthActualContainer && newAuthActualContainer.style.display !== 'none' && typeof newAuthActivateSignInView === 'function') { newAuthActivateSignInView(); }}
        else if (targetViewId === STORE_PAGE) { document.documentElement.classList.add('store-view'); document.body.classList.add('store-view'); }
        else if (targetViewId === PRODUCT_DETAIL_PAGE) { document.documentElement.classList.add('product-detail-view'); document.body.classList.add('product-detail-view'); }
        else if (targetViewId === CHECKOUT_PAGE) { document.documentElement.classList.add('checkout-view'); document.body.classList.add('checkout-view'); }
        else if (targetViewId === MY_ORDERS_PAGE) { document.documentElement.classList.add('my-orders-view'); document.body.classList.add('my-orders-view'); renderMyOrders(); }
        else if (targetViewId === SEARCH_RESULTS_PAGE) {
            document.documentElement.classList.add('store-view');
            document.body.classList.add('store-view');
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
        window.scrollTo(0, 0);
    } catch (e) {
        console.error("Error in switchView for target", targetViewId, ":", e);
        if (pageContainers[AUTH_PAGE]) pageContainers[AUTH_PAGE].style.display = 'flex';
        const newAuthUI = document.getElementById('newAuthActualContainer'); if(newAuthUI) newAuthUI.style.display = '';
    }

    // Show footer only on store page
    const footer = document.getElementById('contact-profile-footer');
    if (footer) {
        if (targetViewId === 'store-page-container') {
            footer.style.display = '';
        } else {
            footer.style.display = 'none';
        }
    }
}

// --- Admin Login Modal Logic ---
const adminUsernameField = document.getElementById('admin-username-input'); const adminPasswordField = document.getElementById('admin-password-input'); const adminLoginSubmitBtn = document.getElementById('admin-login-submit-btn'); const closeAdminLoginModalBtn = document.getElementById('close-admin-login-modal-btn'); const adminLoginErrorMsg = document.getElementById('admin-login-error');
function showAdminLoginModal() {const newAuthActualContainer=document.getElementById('newAuthActualContainer');if(adminLoginModalEl&&pageContainers[AUTH_PAGE]){pageContainers[AUTH_PAGE].style.display='flex';if(newAuthActualContainer)newAuthActualContainer.style.display='none';adminLoginModalEl.style.display='flex';document.documentElement.className='auth-active';document.body.className='auth-active';if(adminUsernameField){adminUsernameField.value='';adminUsernameField.focus();}if(adminPasswordField)adminPasswordField.value='';if(adminLoginErrorMsg)adminLoginErrorMsg.style.display='none';if(typeof lucide!=='undefined')lucide.createIcons();}}
function checkAdminCredentials(username,password){if(username===ADMIN_USERNAME&&password===ADMIN_PASSWORD){isAdminLoggedIn=true;sessionStorage.setItem('isAdminLoggedIn','true');if(adminLoginModalEl)adminLoginModalEl.style.display='none';if(adminLoginErrorMsg)adminLoginErrorMsg.style.display='none';alert("Admin login successful! Redirecting...");window.location.href=ADMIN_DASHBOARD_URL;}else{if(adminLoginErrorMsg){adminLoginErrorMsg.textContent="Invalid admin credentials.";adminLoginErrorMsg.style.display='block';}else{alert("Invalid admin credentials.");}isAdminLoggedIn=false;}}

// --- New Auth UI ---
const newAuthSignUpButtonDesktop = document.getElementById('signUp'); const newAuthSignInButtonDesktop = document.getElementById('signIn'); const newAuthMobileSignUpLink = document.getElementById('mobileSignUpLink'); const newAuthMobileSignInLink = document.getElementById('mobileSignInLink'); const newAuthActualContainer = document.getElementById('newAuthActualContainer'); const newAuthSignInFormContainer = document.querySelector('#newAuthActualContainer .sign-in-container'); const newAuthSignUpFormContainer = document.querySelector('#newAuthActualContainer .sign-up-container'); const newSignInForm = document.getElementById('newSignInForm'); const newSignUpForm = document.getElementById('newSignUpForm');
function newAuthActivateSignUpView(){if(!newAuthActualContainer)return;newAuthActualContainer.classList.add("right-panel-active");if(window.innerWidth<=767){if(newAuthSignInFormContainer)newAuthSignInFormContainer.style.display='none';if(newAuthSignUpFormContainer)newAuthSignUpFormContainer.style.display='flex';}}
function newAuthActivateSignInView(){if(!newAuthActualContainer)return;newAuthActualContainer.classList.remove("right-panel-active");if(window.innerWidth<=767){if(newAuthSignUpFormContainer)newAuthSignUpFormContainer.style.display='none';if(newAuthSignInFormContainer)newAuthSignInFormContainer.style.display='flex';}}
if(newAuthSignUpButtonDesktop)newAuthSignUpButtonDesktop.addEventListener('click',newAuthActivateSignUpView);if(newAuthSignInButtonDesktop)newAuthSignInButtonDesktop.addEventListener('click',newAuthActivateSignInView);if(newAuthMobileSignUpLink)newAuthMobileSignUpLink.addEventListener('click',(e)=>{e.preventDefault();newAuthActivateSignUpView();});if(newAuthMobileSignInLink)newAuthMobileSignInLink.addEventListener('click',(e)=>{e.preventDefault();newAuthActivateSignInView();});
function newAuthSetInitialMobileState(){if(!newAuthActualContainer)return;const overlay=newAuthActualContainer.querySelector('.overlay-container');if(window.innerWidth<=767){if(overlay)overlay.style.display='none';if(newAuthActualContainer.classList.contains("right-panel-active")){if(newAuthSignInFormContainer)newAuthSignInFormContainer.style.display='none';if(newAuthSignUpFormContainer)newAuthSignUpFormContainer.style.display='flex';}else{if(newAuthSignInFormContainer)newAuthSignInFormContainer.style.display='flex';if(newAuthSignUpFormContainer)newAuthSignUpFormContainer.style.display='none';}}else{if(overlay)overlay.style.display='block';if(newAuthSignInFormContainer)newAuthSignInFormContainer.style.display='flex';if(newAuthSignUpFormContainer)newAuthSignUpFormContainer.style.display='flex';}}
window.addEventListener('resize',newAuthSetInitialMobileState);
if (newSignUpForm) { newSignUpForm.addEventListener('submit', function(event) { event.preventDefault(); if (!auth) { alert("Firebase Auth not initialized."); return; } const username = document.getElementById('newSignUpUsername').value.trim(); const email = document.getElementById('newSignUpEmail').value.trim(); const password = document.getElementById('newSignUpPassword').value.trim(); const confirmPassword = document.getElementById('newSignUpConfirmPassword').value.trim(); if (!username || !email || !password || !confirmPassword) { alert('Please fill in all fields.'); return; } if (password.length < 6) { alert("Password should be at least 6 characters."); return; } if (password !== confirmPassword) { alert('Passwords do not match!'); return; } auth.createUserWithEmailAndPassword(email, password).then((userCredential) => { const user = userCredential.user; return db.collection("users").doc(user.uid).set({ username: username, email: email, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); }).then(() => { alert(`Account created for ${username}! Please login.`); newAuthActivateSignInView(); newSignUpForm.reset(); }).catch((error) => { alert(`Signup Error: ${error.message}`); }); }); }
if (newSignInForm) { newSignInForm.addEventListener('submit', function(event) { event.preventDefault(); if (!auth) { alert("Firebase Auth not initialized."); return; } const email = document.getElementById('newSignInUsername').value.trim(); const password = document.getElementById('newSignInPassword').value.trim(); if (!email || !password) { alert('Please fill in Email and Password.'); return; } auth.signInWithEmailAndPassword(email, password).catch((error) => { alert(`Login Error: ${error.message}`); }); }); }

// --- Handle Auth State Changes (Firebase) ---
if (auth) { auth.onAuthStateChanged(async (user) => { if (user) { firebaseCurrentUser = user; try { const userDoc = await db.collection("users").doc(user.uid).get(); if (userDoc.exists) { currentUserUsernameForDisplay = userDoc.data().username; sessionStorage.setItem('currentUserUsername', currentUserUsernameForDisplay); } else { currentUserUsernameForDisplay = user.email; sessionStorage.setItem('currentUserUsername', currentUserUsernameForDisplay);}} catch (error) { currentUserUsernameForDisplay = user.email; sessionStorage.setItem('currentUserUsername', currentUserUsernameForDisplay);} loadTempCart(); const isOnAuthPage = pageContainers[AUTH_PAGE] && (getComputedStyle(pageContainers[AUTH_PAGE]).display === 'flex'); if (isOnAuthPage && !isAdminLoggedIn) { switchView(STORE_PAGE); } else if (!Object.values(pageContainers).some(p => p && getComputedStyle(p).display !== 'none')) { switchView(STORE_PAGE); } } else { firebaseCurrentUser = null; currentUserUsernameForDisplay = null; sessionStorage.removeItem('currentUserUsername'); cart = {}; updateCartUI(); const isProtectedPage = [MY_ORDERS_PAGE, CHECKOUT_PAGE, STORE_PAGE, PRODUCT_DETAIL_PAGE].some(id => pageContainers[id] && getComputedStyle(pageContainers[id]).display !== 'none'); const isNotAdminAttempt = window.location.hash !== ADMIN_LOGIN_HASH && (!adminLoginModalEl || getComputedStyle(adminLoginModalEl).display === 'none'); const isNotAuthPageAlready = !pageContainers[AUTH_PAGE] || getComputedStyle(pageContainers[AUTH_PAGE]).display === 'none'; if(isProtectedPage && isNotAdminAttempt && isNotAuthPageAlready){ switchView(AUTH_PAGE); } } }); }
else { console.error("Firebase auth object is not initialized."); }

// --- III. STORE PAGE: DATA & CORE LOGIC ---
function createStars(rating) { let stars = ''; for (let i = 0; i < 5; i++) stars += i < Math.round(rating) ? '★' : '☆'; return stars; }
function formatPrice(price) {
    return '₹' + Number(price).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

// --- IV. STORE PAGE: PRODUCT RENDERING & SEARCH ---
function renderProducts(productsToRender, containerElement, categoryKey) { if (!containerElement) { return; } containerElement.innerHTML = ''; if (!productsToRender || productsToRender.length === 0) { const categoryName = categoryKey ? categoryKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "this category"; containerElement.innerHTML = `<p style="color:#aaa; text-align:center; grid-column: 1 / -1; padding: 20px;">${Object.keys(productsData).length === 0 ? 'Loading products...' : `No products found in ${categoryName}.`}</p>`; return; } productsToRender.forEach(product => { const card = document.createElement('article'); card.className = 'product-card'; card.setAttribute('tabindex', '0'); card.setAttribute('aria-label', `View details for ${product.title}`); card.dataset.productId = product.id; card.innerHTML = `<div class="product-image"><img src="${product.image || product.img}" alt="${product.title}" loading="lazy" /></div><div class="product-info"><h3 class="product-title">${product.title}</h3> <p class="product-price">${formatPrice(product.price)}</p><p class="product-rating" aria-label="${product.rating} star rating">${createStars(product.rating)}</p><button class="btn-add-cart" aria-label="Add ${product.title} to cart" data-id="${product.id}" ${product.stock <= 0 ? 'disabled' : ''}>${product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}</button></div>`; containerElement.appendChild(card); });}
function performSearch(searchTerm = "") { const term = searchTerm.toLowerCase().trim(); if (Object.keys(productsData).length === 0 && term !== "") { return; } Object.keys(productsData).forEach(categoryKey => { const gridContainer = document.getElementById(categoryKey + '-grid'); if (!gridContainer) return; if (!productsData[categoryKey]) { renderProducts([], gridContainer, categoryKey); return; } const filteredProducts = productsData[categoryKey].filter(p => p.title.toLowerCase().includes(term) || (p.description && p.description.toLowerCase().includes(term))); renderProducts(filteredProducts, gridContainer, categoryKey); });}

// --- V. STORE PAGE: CART LOGIC & UI ---
function findProductById(productId) { for (const category in productsData) { if (productsData[category]) { const product = productsData[category].find(p => p.id === productId); if (product) return product; } } console.warn(`Product not found with ID: ${productId}`); return null; }
function addToCart(productId) { if (!firebaseCurrentUser) { alert("Log in to add to cart."); switchView(AUTH_PAGE); return; } let p = findProductById(productId); if (!p) { return;} if (p.stock <= 0) { alert("Out of stock."); return; } const cartKey = p.id; if (cart[cartKey]) { if (cart[cartKey].quantity < p.stock) cart[cartKey].quantity++; else { alert("Max stock reached."); return; } } else { cart[cartKey] = { ...p, quantity: 1 }; } updateCartUI(); saveTempCart(); }
function removeFromCart(productId) { if (!firebaseCurrentUser) return; const productInCart = Object.values(cart).find(item => item.id === productId); if (!productInCart) return; delete cart[productInCart.id]; updateCartUI(); saveTempCart(); }
function changeQuantity(productId, delta) { if (!firebaseCurrentUser) return; const productInCart = Object.values(cart).find(item => item.id === productId); if (!productInCart) return; let p = findProductById(productId); if (!p) { removeFromCart(productId); return; } const nQty = productInCart.quantity + delta; if (nQty <= 0) removeFromCart(productId); else if (nQty > p.stock) { alert(`Max stock: ${p.stock}`); productInCart.quantity = p.stock; } else { productInCart.quantity = nQty; } updateCartUI(); saveTempCart(); }
function updateCartUI() { const cCount = Object.values(cart).reduce((s, i) => s + i.quantity, 0); const cBtn = document.getElementById('cart-btn'); const cCountEl = document.getElementById('cart-count'); const cContEl = document.getElementById('cart-content'); const cTotalEl = document.getElementById('cart-total'); const cCheckoutBtn = document.getElementById('cart-checkout-btn'); if (!cBtn || !cCountEl || !cContEl || !cTotalEl || !cCheckoutBtn) return; cCountEl.textContent = cCount; cCountEl.style.visibility = cCount > 0 ? 'visible' : 'hidden'; if (cCount > 0 && pageContainers[STORE_PAGE] && pageContainers[STORE_PAGE].style.display !== 'none' && window.getComputedStyle(cBtn).display !== 'none') { cBtn.classList.remove('bump'); void cBtn.offsetWidth; cBtn.classList.add('bump'); } cContEl.innerHTML = ''; if (cCount === 0) { cContEl.innerHTML = '<p style="color:#aaa; padding:1rem; text-align:center;">Your cart is empty.</p>'; cTotalEl.textContent = `Total: ${formatPrice(0)}`; cCheckoutBtn.disabled = true; return; } cCheckoutBtn.disabled = false; let total = 0; Object.values(cart).forEach(i => { const iTotal = i.price * i.quantity; total += iTotal; const iDiv = document.createElement('div'); iDiv.className = 'cart-item'; iDiv.innerHTML = `<img src="${i.img||i.image}" alt="${i.title}" /><div class="cart-item-info"><div class="cart-item-name">${i.title}</div><div class="cart-item-quantity"><button class="cart-quantity-btn" data-id="${i.id}" data-action="decrease">−</button><span>${i.quantity}</span><button class="cart-quantity-btn" data-id="${i.id}" data-action="increase">+</button></div><div class="cart-item-price">${formatPrice(iTotal)}</div></div><button class="cart-item-remove" data-id="${i.id}">×</button>`; cContEl.appendChild(iDiv); }); cTotalEl.textContent = `Total: ${formatPrice(total)}`; }

// --- VI. PRODUCT DETAIL PAGE LOGIC ---
function showProductDetail(productId) {
    const p = findProductById(productId);
    if (!p) { alert("Product details not found."); switchView(STORE_PAGE); return; }
    const mainImageElement = document.getElementById('main-product-image');
    const mainImageUrl = p.image || p.img || "https://via.placeholder.com/600x400?text=Image+Not+Available";
    if (mainImageElement) {
        mainImageElement.src = mainImageUrl; 
        mainImageElement.alt = p.title;
        // Attach zoom only for product detail image
        mainImageElement.onclick = function() {
            openImageZoom(mainImageElement.src, mainImageElement.alt);
        };
    }
    const thumbnailRow = document.querySelector('.product-detail-grid .thumbnail-row');
    if (thumbnailRow) {
        thumbnailRow.innerHTML = ''; let allImagesForThumbnails = [mainImageUrl].filter(url => url && !url.includes("via.placeholder.com/600"));
        if (p.otherImages && Array.isArray(p.otherImages)) { p.otherImages.forEach(imgUrl => { if (imgUrl && !allImagesForThumbnails.includes(imgUrl)) { allImagesForThumbnails.push(imgUrl); }}); }
        if (allImagesForThumbnails.length === 0) { allImagesForThumbnails.push("https://via.placeholder.com/100x100?text=N/A"); }
        if (allImagesForThumbnails.length === 1 && allImagesForThumbnails[0].includes("via.placeholder.com/100x100") && mainImageUrl) { allImagesForThumbnails = [mainImageUrl];}
        allImagesForThumbnails.forEach((imgUrl, index) => { const thumbImg = document.createElement('img'); thumbImg.className = 'thumbnail'; thumbImg.src = imgUrl; thumbImg.alt = `${p.title} - view ${index + 1}`; thumbnailRow.appendChild(thumbImg); });
        initializeThumbnailEventListeners();
    }
    document.getElementById('product-detail-title').textContent = p.title;
    document.getElementById('product-detail-price').textContent = formatPrice(p.price);
    document.getElementById('product-detail-rating').innerHTML = createStars(p.rating);
    const stockEl = document.getElementById('product-detail-stock'); stockEl.className = 'mb-3';
    if (p.stock > 0) { stockEl.textContent = `In Stock: ${p.stock}`; stockEl.classList.add('product-stock-available'); }
    else { stockEl.textContent = "Out of Stock"; stockEl.classList.add('product-stock-unavailable', 'out-of-stock'); }
    document.getElementById('product-detail-description').textContent = p.description || "No detailed description.";
    const addBtn = document.getElementById('product-detail-add-to-cart-btn'); addBtn.dataset.id = p.id; addBtn.disabled = p.stock <= 0; addBtn.textContent = p.stock <= 0 ? "Out of Stock" : "Add to Cart";
    switchView(PRODUCT_DETAIL_PAGE);
}

// --- VII. THUMBNAIL INTERACTION LOGIC ---
function handleThumbnailClick(event) { const mainImage = document.getElementById('main-product-image'); if (mainImage && event.target.src) { mainImage.src = event.target.src; document.querySelectorAll('.thumbnail-row .thumbnail').forEach(img => img.classList.remove('active-thumbnail')); event.target.classList.add('active-thumbnail'); } }
function initializeThumbnailEventListeners() { const thumbnails = document.querySelectorAll('.thumbnail-row .thumbnail'); thumbnails.forEach(img => { img.removeEventListener('click', handleThumbnailClick); img.addEventListener('click', handleThumbnailClick); }); const mainImageSrc = document.getElementById('main-product-image')?.src; let activeThumbSet = false; if (mainImageSrc) { thumbnails.forEach(thumb => { if (thumb.src === mainImageSrc) { thumb.classList.add('active-thumbnail'); activeThumbSet = true; } else { thumb.classList.remove('active-thumbnail'); }}); } if (!activeThumbSet && thumbnails.length > 0) { thumbnails.forEach(img => img.classList.remove('active-thumbnail')); thumbnails[0].classList.add('active-thumbnail'); } }

// --- IMAGE ZOOM MODAL LOGIC (BAZAROOO-like) ---
imageZoomModal = document.getElementById('image-zoom-modal');
zoomedImage = document.getElementById('zoomed-image');
let zoomLevel = 1, isDragging = false, dragStart = {x:0, y:0}, imgOffset = {x:0, y:0};

function openImageZoom(src, alt) {
    if (!imageZoomModal || !zoomedImage) return;
    zoomedImage.src = src;
    zoomedImage.alt = alt || '';
    zoomLevel = 1;
    imgOffset = {x:0, y:0};
    zoomedImage.style.transform = 'scale(1) translate(0px,0px)';
    imageZoomModal.classList.add('active');
    imageZoomModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}
function closeImageZoom() {
    imageZoomModal.classList.remove('active');
    imageZoomModal.style.display = 'none';
    document.body.style.overflow = '';
}
if (imageZoomModal && zoomedImage) {
    // Mouse wheel or pinch to zoom
    zoomedImage.addEventListener('wheel', function(e) {
        e.preventDefault();
        let delta = e.deltaY < 0 ? 0.15 : -0.15;
        zoomLevel = Math.min(Math.max(zoomLevel + delta, 1), 4);
        zoomedImage.style.transform = `scale(${zoomLevel}) translate(${imgOffset.x}px,${imgOffset.y}px)`;
    }, { passive: false });

    // Touch pinch to zoom
    let lastDist = null;
    zoomedImage.addEventListener('touchmove', function(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (lastDist) {
                let delta = (dist - lastDist) / 200;
                zoomLevel = Math.min(Math.max(zoomLevel + delta, 1), 4);
                zoomedImage.style.transform = `scale(${zoomLevel}) translate(${imgOffset.x}px,${imgOffset.y}px)`;
            }
            lastDist = dist;
        }
    }, { passive: false });
    zoomedImage.addEventListener('touchend', function(e) { lastDist = null; });

    // Drag to pan
    zoomedImage.addEventListener('mousedown', function(e) {
        if (zoomLevel === 1) return;
        isDragging = true;
        dragStart = { x: e.clientX, y: e.clientY };
        zoomedImage.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        let dx = e.clientX - dragStart.x;
        let dy = e.clientY - dragStart.y;
        imgOffset.x += dx;
        imgOffset.y += dy;
        dragStart = { x: e.clientX, y: e.clientY };
        zoomedImage.style.transform = `scale(${zoomLevel}) translate(${imgOffset.x}px,${imgOffset.y}px)`;
    });
    document.addEventListener('mouseup', function() {
        isDragging = false;
        zoomedImage.style.cursor = 'grab';
    });

    // Touch drag to pan
    zoomedImage.addEventListener('touchstart', function(e) {
        if (zoomLevel === 1 || e.touches.length !== 1) return;
        isDragging = true;
        dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: false });
    zoomedImage.addEventListener('touchmove', function(e) {
        if (!isDragging || e.touches.length !== 1) return;
        let dx = e.touches[0].clientX - dragStart.x;
        let dy = e.touches[0].clientY - dragStart.y;
        imgOffset.x += dx;
        imgOffset.y += dy;
        dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        zoomedImage.style.transform = `scale(${zoomLevel}) translate(${imgOffset.x}px,${imgOffset.y}px)`;
    }, { passive: false });
    zoomedImage.addEventListener('touchend', function() { isDragging = false; });

    // Click/tap outside or on image to close
    imageZoomModal.addEventListener('click', function(e) {
        if (e.target === imageZoomModal || e.target === zoomedImage) closeImageZoom();
    });
}

// --- ORDER DETAILS MODAL LOGIC ---
// (Order images should NOT open zoom, only open product detail page)
function showOrderDetailsModal(order) {
    let html = `
        <div><strong>Order ID:</strong> ${escapeHtml(order.orderId || order.id)}</div>
        <div><strong>Date:</strong> ${order.timestamp ? new Date(order.timestamp.toDate()).toLocaleString() : 'N/A'}</div>
        <div><strong>Status:</strong> ${escapeHtml(order.status)}</div>
        <div><strong>Shipping To:</strong> ${escapeHtml(order.shippingDetails.name)}, ${escapeHtml(order.shippingDetails.address)}, ${escapeHtml(order.shippingDetails.city)}, ${escapeHtml(order.shippingDetails.postal)}</div>
        <div><strong>Payment:</strong> ${escapeHtml(order.paymentMethodDisplay)}</div>
        <h3 style="margin-top:18px;">Ordered Products</h3>
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>Title</th>
              <th>Qty</th>
              <th>Price (₹)</th>
              <th>Subtotal (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${(order.items || []).map(item => `
              <tr>
                <td>
                  <a href="#" class="order-product-link" data-product-id="${item.id}">
                    <img src="${escapeHtml(item.image || item.img || 'https://via.placeholder.com/60x60?text=No+Image')}" alt="${escapeHtml(item.title)}" style="width:60px;height:60px;object-fit:contain;border-radius:6px;background:#222;">
                  </a>
                </td>
                <td>${escapeHtml(item.title)}</td>
                <td>${item.quantity}</td>
                <td>₹${Number(item.price).toLocaleString('en-IN')}</td>
                <td>₹${Number(item.price * item.quantity).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top:12px;"><strong>Total:</strong> ₹${Number(order.total).toLocaleString('en-IN')}</div>
    `;
    orderDetailsContent.innerHTML = html;
    orderDetailsModal.style.display = 'flex';
    orderDetailsModal.focus();

    // Only open product detail page on image click
    orderDetailsContent.querySelectorAll('.order-product-link img').forEach(img => {
        img.addEventListener('click', function(e) {
            e.preventDefault();
            const productId = this.closest('.order-product-link').getAttribute('data-product-id');
            if (productId) {
                orderDetailsModal.style.display = 'none';
                showProductDetail(productId);
            }
        });
    });
}

// --- VIII. IMAGE ZOOM MODAL LOGIC ---
function assignZoomModalDOMElements() {
    imageZoomModal = document.getElementById('image-zoom-modal');
    closeZoomModalBtn = document.querySelector('.close-zoom-modal-btn');
    zoomedImage = document.getElementById('zoomed-image');
    zoomModalContent = document.querySelector('.zoom-modal-content');
    zoomInImageBtn = document.getElementById('zoom-in-image-btn');
    zoomOutImageBtn = document.getElementById('zoom-out-image-btn');
    zoomResetImageBtn = document.getElementById('zoom-reset-image-btn');
}

function openImageZoomModalHandler(event) {
    if (!imageZoomModal || !zoomedImage) { console.error("Zoom modal elements not found."); return; }
    const clickedImageSrc = event.target.src; const clickedImageAlt = event.target.alt;
    zoomedImage.src = clickedImageSrc; zoomedImage.alt = clickedImageAlt;
    const altTextSpan = document.getElementById('zoomed-image-alt-text');
    if (altTextSpan) altTextSpan.textContent = `Zoomed view of ${clickedImageAlt}`;
    resetZoomAndPan(); 
    imageZoomModal.classList.add('active'); // This makes it visible via CSS
    document.body.style.overflow = 'hidden';
}

function closeImageZoomModal() { 
    if (!imageZoomModal) return; 
    imageZoomModal.classList.remove('active'); // This hides it via CSS
    document.body.style.overflow = ''; 
    resetZoomAndPan(); 
}

function updateZoomButtons() { if (!zoomInImageBtn || !zoomOutImageBtn) return; zoomInImageBtn.disabled = currentZoomLevel >= MAX_ZOOM; zoomOutImageBtn.disabled = currentZoomLevel <= MIN_ZOOM; }

function applyZoom(newZoomLevel, zoomOriginX, zoomOriginY) {
    if (!zoomedImage || !zoomModalContent) return;
    const oldZoomLevel = currentZoomLevel;
    currentZoomLevel = newZoomLevel;

    const currentTransform = window.getComputedStyle(zoomedImage).transform;
    let prevTx = 0, prevTy = 0;
    if (currentTransform && currentTransform !== 'none') { const matrix = new DOMMatrixReadOnly(currentTransform); prevTx = matrix.e; prevTy = matrix.f; }

    const originX = (typeof zoomOriginX === 'number') ? zoomOriginX : zoomedImage.offsetWidth / 2;
    const originY = (typeof zoomOriginY === 'number') ? zoomOriginY : zoomedImage.offsetHeight / 2;
    zoomedImage.style.transformOrigin = `${originX}px ${originY}px`;

    let newTx = (prevTx - originX) * (currentZoomLevel / oldZoomLevel) + originX;
    let newTy = (prevTy - originY) * (currentZoomLevel / oldZoomLevel) + originY;

    if (currentZoomLevel === 1) {
        zoomedImage.style.transformOrigin = 'center center';
        zoomedImage.style.transform = 'scale(1) translate(0px, 0px)';
        if (zoomModalContent) zoomModalContent.classList.remove('grabbing');
    } else {
        const containerRect = zoomModalContent.getBoundingClientRect();
        const scaledWidth = zoomedImage.offsetWidth * currentZoomLevel;
        const scaledHeight = zoomedImage.offsetHeight * currentZoomLevel;
        const maxTx = Math.max(0, (scaledWidth - containerRect.width) / 2);
        const maxTy = Math.max(0, (scaledHeight - containerRect.height) / 2);
        if (scaledWidth > containerRect.width) { newTx = Math.max(Math.min(newTx, maxTx), -maxTx); } else { newTx = 0; }
        if (scaledHeight > containerRect.height) { newTy = Math.max(Math.min(newTy, maxTy), -maxTy); } else { newTy = 0; }
        zoomedImage.style.transform = `translate(${newX}px, ${newY}px) scale(${currentZoomLevel})`;
    }
    updateZoomButtons();
}

function resetZoomAndPan() { applyZoom(1); isPanning = false; }

function panImageStart(e) {
    if (currentZoomLevel <= 1 || !zoomModalContent || !zoomedImage) return;
    if (e.type === 'touchstart') e.preventDefault();
    isPanning = true; zoomModalContent.classList.add('grabbing');
    panStartX = e.clientX || e.touches[0].clientX; panStartY = e.clientY || e.touches[0].clientY;
    const currentTransform = window.getComputedStyle(zoomedImage).transform;
    if (currentTransform && currentTransform !== 'none') { const matrix = new DOMMatrixReadOnly(currentTransform); imgStartLeft = matrix.e; imgStartTop = matrix.f; }
    else { imgStartLeft = 0; imgStartTop = 0; }
}

function panImageMove(e) {
    if (!isPanning || !zoomedImage) return;
    if (e.type === 'touchmove') e.preventDefault();
    const currentX = e.clientX || e.touches[0].clientX; const currentY = e.clientY || e.touches[0].clientY;
    let dx = currentX - panStartX; let dy = currentY - panStartY;
    let newX = imgStartLeft + dx; let newY = imgStartTop + dy;
    const containerRect = zoomModalContent.getBoundingClientRect();
    const scaledWidth = zoomedImage.offsetWidth * currentZoomLevel;
    const scaledHeight = zoomedImage.offsetHeight * currentZoomLevel;
    const maxTx = Math.max(0, (scaledWidth - containerRect.width) / 2);
    const maxTy = Math.max(0, (scaledHeight - containerRect.height) / 2);
    if (scaledWidth > containerRect.width) { newX = Math.max(Math.min(newX, maxTx), -maxTx); } else { newX = 0; }
    if (scaledHeight > containerRect.height) { newY = Math.max(Math.min(newY, maxTy), -maxTy); } else { newY = 0; }
    zoomedImage.style.transform = `translate(${newX}px, ${newY}px) scale(${currentZoomLevel})`;
}

function panImageEnd() { if (!isPanning) return; isPanning = false; if(zoomModalContent) zoomModalContent.classList.remove('grabbing'); }

function handleZoomedImageClick(event) {
    if (!zoomedImage || !imageZoomModal.classList.contains('active')) return;
    const originX = event.offsetX; const originY = event.offsetY;
    let nextZoom;
    if (currentZoomLevel >= MAX_ZOOM) { nextZoom = 1; }
    else { nextZoom = (currentZoomLevel < (CLICK_ZOOM_LEVEL - ZOOM_STEP/2)) ? Math.min(CLICK_ZOOM_LEVEL, MAX_ZOOM) : Math.min(currentZoomLevel + ZOOM_STEP * 2, MAX_ZOOM); } // Jump to CLICK_ZOOM_LEVEL or step up
    applyZoom(nextZoom, originX, originY);
}

function setupZoomModalEventListeners() {
    if (!imageZoomModal || !closeZoomModalBtn || !zoomInImageBtn || !zoomOutImageBtn || !zoomResetImageBtn || !zoomModalContent || !zoomedImage) { console.warn("Zoom modal elements missing."); return; }
    closeZoomModalBtn.addEventListener('click', closeImageZoomModal);
    imageZoomModal.addEventListener('click', (e) => { if (e.target === imageZoomModal) { closeImageZoomModal(); }});
    zoomInImageBtn.addEventListener('click', () => { if (currentZoomLevel < MAX_ZOOM) { applyZoom(Math.min(currentZoomLevel + ZOOM_STEP, MAX_ZOOM)); }});
    zoomOutImageBtn.addEventListener('click', () => { if (currentZoomLevel > MIN_ZOOM) { let newLevel = Math.max(currentZoomLevel - ZOOM_STEP, MIN_ZOOM); if (newLevel < 1.01 && newLevel > 0.99) newLevel = 1; applyZoom(newLevel); }});
    zoomResetImageBtn.addEventListener('click', resetZoomAndPan);
    zoomedImage.addEventListener('click', handleZoomedImageClick);
    zoomModalContent.addEventListener('mousedown', panImageStart); zoomModalContent.addEventListener('touchstart', panImageStart, { passive: false });
    document.addEventListener('mousemove', panImageMove); document.addEventListener('mouseup', panImageEnd);
    document.addEventListener('touchmove', panImageMove, { passive: false }); document.addEventListener('touchend', panImageEnd);
    zoomModalContent.addEventListener('wheel', (e) => {
        if (imageZoomModal.classList.contains('active')) {
            e.preventDefault();
            const rect = zoomModalContent.getBoundingClientRect();
            const mouseXInContainer = e.clientX - rect.left; const mouseYInContainer = e.clientY - rect.top;
            let newZoomLevel;
            if (e.deltaY < 0) { newZoomLevel = Math.min(currentZoomLevel + ZOOM_STEP, MAX_ZOOM); }
            else { newZoomLevel = Math.max(currentZoomLevel - ZOOM_STEP, MIN_ZOOM); }
            if (newZoomLevel < 1.01 && newZoomLevel > 0.99 && newZoomLevel !==1 ) newZoomLevel = 1;
            applyZoom(newZoomLevel, mouseXInContainer, mouseYInContainer);
        }
    }, { passive: false });
}

// --- IX. STORE PAGE: UI INTERACTIONS SETUP ---
function handleLogout() { if (auth) { auth.signOut().catch(e => console.error("Sign out error:", e)); } else { firebaseCurrentUser=null; currentUserUsernameForDisplay=null; sessionStorage.removeItem('currentUserUsername'); cart={}; updateCartUI(); switchView(AUTH_PAGE);}}
function setupStoreInteractions() { document.body.addEventListener('click', (e) => { const addBtn = e.target.closest('.btn-add-cart') || (e.target.id === 'product-detail-add-to-cart-btn' ? e.target : null); if (addBtn && !addBtn.disabled) { const pId = addBtn.dataset.id; if (pId) { addToCart(pId); if (addBtn.classList.contains('btn-add-cart') && addBtn.id !== 'product-detail-add-to-cart-btn') { addBtn.textContent = 'Added!'; addBtn.classList.add('added'); setTimeout(() => { const cP = findProductById(pId); addBtn.textContent = (cP && cP.stock > 0) ? 'Add to Cart' : 'Out of Stock'; addBtn.classList.remove('added'); }, 1000); } else if (addBtn.id === 'product-detail-add-to-cart-btn') { const p = findProductById(pId); alert(`${p ? p.title : 'Product'} added to cart!`); } } return; } const qtyBtn = e.target.closest('.cart-quantity-btn'); if (qtyBtn) { changeQuantity(qtyBtn.dataset.id, qtyBtn.dataset.action === 'increase' ? 1 : -1); return; } const rmvBtn = e.target.closest('.cart-item-remove'); if (rmvBtn) { removeFromCart(rmvBtn.dataset.id); return; } const pCard = e.target.closest('.product-card'); if (pCard && !e.target.closest('button.btn-add-cart')) { const pId = pCard.dataset.productId; if (pId) showProductDetail(pId); return; } }); const pdBackBtn = document.getElementById('product-detail-back-btn'); if (pdBackBtn) pdBackBtn.addEventListener('click', () => switchView(STORE_PAGE)); const cBtn = document.getElementById('cart-btn'), cModal = document.getElementById('cart-modal'), cCloseBtn = document.getElementById('cart-close-btn'); if (cBtn && cModal && cCloseBtn) { const oC = () => { cModal.classList.add('open'); cBtn.setAttribute('aria-expanded', 'true'); cModal.focus(); }; const clC = () => { cModal.classList.remove('open'); cBtn.setAttribute('aria-expanded', 'false'); cBtn.focus(); }; cBtn.addEventListener('click', () => cModal.classList.contains('open') ? clC() : oC()); cCloseBtn.addEventListener('click', clC); document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && cModal.classList.contains('open')) clC(); }); } const srchBtn = document.getElementById('search-btn'), clSrchBtn = document.getElementById('close-search-btn'), srchInEl = document.getElementById('search-input'), stHdrEl = document.getElementById('main-store-header'), stNavEl = document.getElementById('store-nav'); function tgSrch(show) { if (!stHdrEl || !srchBtn || !clSrchBtn || !srchInEl || !stNavEl) return; if (show) { stHdrEl.classList.add('search-active'); stNavEl.style.display = 'none'; srchBtn.style.display = 'none'; clSrchBtn.style.display = 'flex'; srchInEl.parentElement.style.display = 'flex'; srchInEl.focus(); } else { stHdrEl.classList.remove('search-active'); const isStore = document.body.classList.contains('store-view') || document.body.classList.contains('product-detail-view') || document.body.classList.contains('checkout-view'); stNavEl.style.display = (window.innerWidth > 600 || !isStore) ? 'flex' : 'none'; srchBtn.style.display = 'flex'; clSrchBtn.style.display = 'none'; srchInEl.parentElement.style.display = 'none'; srchInEl.value = ''; performSearch(''); } } if (srchBtn) srchBtn.addEventListener('click', () => tgSrch(true)); if (clSrchBtn) clSrchBtn.addEventListener('click', () => tgSrch(false)); if (srchInEl) srchInEl.addEventListener('input', () => performSearch(srchInEl.value)); const lgtBtn = document.getElementById('logout-btn'); if (lgtBtn) lgtBtn.addEventListener('click', handleLogout); initStoreCarousel(); const pToCOBtn = document.getElementById('cart-checkout-btn'); if (pToCOBtn) pToCOBtn.addEventListener('click', () => { if (!firebaseCurrentUser) { alert("Please log in to proceed."); switchView(AUTH_PAGE); return; } if (Object.keys(cart).length === 0) { alert("Your cart is empty."); return; } if (cModal && cModal.classList.contains('open')) cModal.classList.remove('open'); showCheckoutPage(); }); const myOrdersBtn = document.getElementById('my-orders-btn'); if (myOrdersBtn) myOrdersBtn.addEventListener('click', () => { if (!firebaseCurrentUser) { alert("Please log in to view orders."); switchView(AUTH_PAGE); return; } switchView(MY_ORDERS_PAGE); }); const myOrdersBackBtn = document.getElementById('my-orders-back-to-store-btn'); if (myOrdersBackBtn) myOrdersBackBtn.addEventListener('click', () => switchView(STORE_PAGE)); }

// --- X. CHECKOUT PAGE LOGIC & UI ---
function showCheckoutPage() {
    if (!firebaseCurrentUser || Object.keys(cart).length === 0) {
        alert("Cart empty or not logged in.");
        switchView(STORE_PAGE);
        return;
    }
    switchView(CHECKOUT_PAGE);
    
    // Stepper logic
    let currentStep = 1;
    const steps = Array.from(document.querySelectorAll('.checkout-step'));
    function showStep(n) {
        steps.forEach((step, i) => step.style.display = (i === n-1) ? '' : 'none');
        currentStep = n;
        if (n === 4) renderReviewSummary();
    }
    showStep(1);

    // Step 1 → 2
    document.getElementById('checkout-next-to-delivery').onclick = function() {
        // Validate address form
        const form = document.getElementById('checkout-address-form');
        if (!form.checkValidity()) { form.reportValidity(); return; }
        showStep(2);
    };
    // Step 2 → 1
    document.getElementById('checkout-back-to-address').onclick = function() { showStep(1); };
    // Step 2 → 3
    document.getElementById('checkout-next-to-payment').onclick = function() { showStep(3); };
    // Step 3 → 2
    document.getElementById('checkout-back-to-delivery').onclick = function() { showStep(2); };
    // Step 3 → 4
    document.getElementById('checkout-next-to-review').onclick = function() { showStep(4); };
    // Step 4 → 3
    document.getElementById('checkout-back-to-payment').onclick = function() { showStep(3); };

    // Payment method logic (reuse your existing code)
    const payMthBtns = document.querySelectorAll('.payment-method-btn');
    const upiDetCont = document.getElementById('upi-details-container');
    const cardDetPl = document.getElementById('card-details-placeholder');
    const payDetPl = document.getElementById('paypal-details-placeholder');
    let selPayMth = 'COD';
    payMthBtns.forEach(b => {
        b.classList.remove('active');
        if (b.dataset.method === 'COD') b.classList.add('active');
    });
    if (upiDetCont) upiDetCont.style.display = 'none';
    if (cardDetPl) cardDetPl.style.display = 'none';
    if (payDetPl) payDetPl.style.display = 'none';
    payMthBtns.forEach(b => {
        b.addEventListener('click', function () {
            payMthBtns.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            selPayMth = this.dataset.method;
            if (upiDetCont) upiDetCont.style.display = (selPayMth === 'UPI') ? 'block' : 'none';
            if (cardDetPl) cardDetPl.style.display = (selPayMth === 'CARD') ? 'block' : 'none';
            if (payDetPl) payDetPl.style.display = (selPayMth === 'PAYPAL') ? 'block' : 'none';
            if (selPayMth !== 'UPI' && document.getElementById('upi-id-input')) document.getElementById('upi-id-input').value = '';
        });
    });

    // Review step
    function renderReviewSummary() {
        const sumDiv = document.getElementById('checkout-review-summary');
        const name = document.getElementById('checkout-name').value;
        const email = document.getElementById('checkout-email').value;
        const address = document.getElementById('checkout-address').value;
        const city = document.getElementById('checkout-city').value;
        const postal = document.getElementById('checkout-postal').value;
        const phone = document.getElementById('checkout-phone').value;
        const delivery = document.querySelector('input[name="delivery-time"]:checked').value;
        let deliveryText = delivery === 'express' ? 'Express (1-2 days, ₹99)' : 'Standard (3-5 days, Free)';
        let payText = 'Cash on Delivery';
        if (selPayMth === 'UPI') payText = 'UPI (' + (document.getElementById('upi-id-input').value || '-') + ')';
        else if (selPayMth === 'CARD') payText = 'Credit/Debit Card (Simulated)';
        else if (selPayMth === 'PAYPAL') payText = 'PayPal (Simulated)';
        let itemsHtml = '';
        let total = 0;
        Object.values(cart).forEach(i => {
            itemsHtml += `<div><span>${i.title}</span> x${i.quantity} <span style="float:right;">${formatPrice(i.price * i.quantity)}</span></div>`;
            total += i.price * i.quantity;
        });
        if (delivery === 'express') total += 99;
        sumDiv.innerHTML = `
            <h4>Shipping To:</h4>
            <div>${name}, ${address}, ${city}, ${postal}${phone ? ', ' + phone : ''}</div>
            <h4>Delivery:</h4>
            <div>${deliveryText}</div>
            <h4>Payment:</h4>
            <div>${payText}</div>
            <h4>Items:</h4>
            <div>${itemsHtml}</div>
            <div style="margin-top:10px;font-weight:bold;">Total: ${formatPrice(total)}</div>
        `;
    }

    // Place order
    document.getElementById('place-order-btn').onclick = function(e) {
        e.preventDefault();
        // Gather all info
        const name = document.getElementById('checkout-name').value;
        const email = document.getElementById('checkout-email').value;
        const address = document.getElementById('checkout-address').value;
        const city = document.getElementById('checkout-city').value;
        const postal = document.getElementById('checkout-postal').value;
        const phone = document.getElementById('checkout-phone').value;
        const delivery = document.querySelector('input[name="delivery-time"]:checked').value;
        let payMthDisp = 'Cash on Delivery';
        if (selPayMth === 'UPI') {
            const upiId = document.getElementById('upi-id-input').value.trim();
            if (!upiId) { alert('Enter UPI ID.'); showStep(3); return; }
            payMthDisp = `UPI (${upiId})`;
        } else if (selPayMth === 'CARD') payMthDisp = 'Credit/Debit Card (Simulated)';
        else if (selPayMth === 'PAYPAL') payMthDisp = 'PayPal (Simulated)';
        let total = Object.values(cart).reduce((s, i) => s + (i.price * i.quantity), 0);
        if (delivery === 'express') total += 99;
        const ordId = `ORD${Date.now()}`;
        const shpDet = { name, email, address, city, postal, phone };
        const ordItms = Object.values(cart).map(i => ({ id: i.id, title: i.title, quantity: i.quantity, price: i.price }));
        const newOrd = {
            orderId: ordId,
            userId: firebaseCurrentUser.uid,
            userEmail: firebaseCurrentUser.email,
            userDisplayName: currentUserUsernameForDisplay || firebaseCurrentUser.email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            shippingDetails: shpDet,
            items: ordItms,
            total,
            paymentMethodDisplay: payMthDisp,
            status: "Pending",
            deliveryType: delivery
        };
        if(db){
            db.collection("orders").add(newOrd).then((docRef) => {
                alert(`Thank you, ${shpDet.name}! Order #${ordId} placed.\nTotal: ${formatPrice(total)}\nPayment: ${payMthDisp}`);
                cart = {}; saveTempCart(); updateCartUI();
                showStep(1);
                document.getElementById('checkout-address-form').reset();
                payMthBtns.forEach(b => b.classList.remove('active'));
                document.querySelector('.payment-method-btn[data-method="COD"]').classList.add('active');
                selPayMth = 'COD';
                if (upiDetCont) upiDetCont.style.display = 'none';
                if (document.getElementById('upi-id-input')) document.getElementById('upi-id-input').value = '';
                if (cardDetPl) cardDetPl.style.display = 'none';
                if (payDetPl) payDetPl.style.display = 'none';
                switchView(STORE_PAGE);
            }).catch(error => {
                console.error("Error adding order to Firestore: ", error);
                alert("There was an issue placing your order.");
            });
        } else {
            alert("Database not ready.");
        }
    };
}

// --- XI. STORE PAGE: CAROUSEL INITIALIZATION ---
function initStoreCarousel() { const tr = document.querySelector('#store-page-container .carousel-track'), nxBtn = document.getElementById('nextBtn'), pvBtn = document.getElementById('prevBtn'); if (!tr || !nxBtn || !pvBtn) return; const sl = Array.from(tr.children); if (sl.length === 0) return; let cIdx = 0, isDrg = false, sPos = 0, curTr = 0, pvTr = 0, anID; const slW = () => sl.length > 0 ? (sl[0].getBoundingClientRect().width || window.innerWidth) : window.innerWidth; function sPosByIdx() { curTr = cIdx * -slW(); pvTr = curTr; sSlPos(); } function sSlPos() { tr.style.transform = `translateX(${curTr}px)`; } function anim() { sSlPos(); if (isDrg) requestAnimationFrame(anim); } function gPosX(e) { return e.type.includes('mouse') ? e.pageX : e.touches[0].clientX; } function tStart(e) { isDrg = true; sPos = gPosX(e); anID = requestAnimationFrame(anim); tr.style.transition = 'none'; } function tMov(e) { if (!isDrg) return; const cPos = gPosX(e); curTr = pvTr + cPos - sPos; } function tEnd() { if (!isDrg) return; isDrg = false; cancelAnimationFrame(anID); const mvBy = curTr - pvTr; if (mvBy < -100 && cIdx < sl.length - 1) cIdx++; if (mvBy > 100 && cIdx > 0) cIdx--; sPosByIdx(); tr.style.transition = 'transform 0.6s cubic-bezier(0.4,0,0.2,1)'; } sPosByIdx(); window.addEventListener('resize', sPosByIdx); tr.addEventListener('mousedown', tStart); tr.addEventListener('mouseup', tEnd); tr.addEventListener('mouseleave', () => { if (isDrg) tEnd(); }); tr.addEventListener('mousemove', tMov); tr.addEventListener('touchstart', tStart, { passive: true }); tr.addEventListener('touchend', tEnd); tr.addEventListener('touchmove', tMov, { passive: true }); nxBtn.addEventListener('click', () => { cIdx = (cIdx + 1) % sl.length; sPosByIdx(); }); pvBtn.addEventListener('click', () => { cIdx = (cIdx - 1 + sl.length) % sl.length; sPosByIdx(); }); nxBtn.setAttribute('tabindex', '0'); pvBtn.setAttribute('tabindex', '0'); }

// --- XII. MY ORDERS PAGE LOGIC ---
async function renderMyOrders() { const myOrdersListContainer = document.getElementById('my-orders-list-container'); if (!myOrdersListContainer) { return; } if (!firebaseCurrentUser) { myOrdersListContainer.innerHTML = '<p style="color:#aaa; text-align:center;">Please log in to see your orders.</p>'; return; } myOrdersListContainer.innerHTML = '<p style="color:#aaa; text-align:center;">Loading orders...</p>'; try { if (!db) { myOrdersListContainer.innerHTML = '<p style="color:red; text-align:center;">Database not available.</p>'; return; } const ordersQuery = await db.collection("orders").where("userId", "==", firebaseCurrentUser.uid).orderBy("timestamp", "desc").get(); const userOrders = []; ordersQuery.forEach(doc => { userOrders.push({ id: doc.id, ...doc.data() }); }); myOrdersListContainer.innerHTML = ''; if (userOrders.length === 0) { myOrdersListContainer.innerHTML = '<p style="color:#aaa; text-align:center;">You have no orders yet.</p>'; return; } userOrders.forEach(order => { const orderCard = document.createElement('div'); orderCard.className = 'my-order-card'; const orderDate = order.timestamp ? new Date(order.timestamp.toDate()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Date N/A'; const statusClass = `status-${order.status ? order.status.toLowerCase().replace(/\s+/g, '-') : 'unknown'}`; let itemsHtml = '<ul>'; (order.items || []).forEach(item => { itemsHtml += `<li><span class="item-name">${escapeHtml(item.title)}</span> (x${item.quantity}) - <span class="item-qty-price">${formatPrice(item.price * item.quantity)}</span></li>`; }); itemsHtml += '</ul>'; orderCard.innerHTML = `<div class="my-order-card-header"> <span class="my-order-id">Order ID: ${escapeHtml(order.orderId || order.id)}</span> <div> <span class="my-order-date">Placed: ${orderDate}</span> | <span class="my-order-status">Status: <span class="${statusClass}">${escapeHtml(order.status)}</span></span> </div> </div><div class="my-order-details-grid"> <div class="my-order-shipping-info"> <h4>Shipping To:</h4> <p>${escapeHtml(order.shippingDetails.name)}</p> <p>${escapeHtml(order.shippingDetails.address)}</p> <p>${escapeHtml(order.shippingDetails.city)}, ${escapeHtml(order.shippingDetails.postal)}</p> ${order.shippingDetails.phone ? `<p>Phone: ${escapeHtml(order.shippingDetails.phone)}</p>` : ''} </div> <div class="my-order-payment-info"> <h4>Payment:</h4> <p>Method: ${escapeHtml(order.paymentMethodDisplay)}</p> <p class="my-order-total" style="text-align:left; border-top:none; padding-top:0; margin-top:5px;">Total: ${formatPrice(order.total)}</p> </div> </div><div class="my-order-items-list"> <h4>Items:</h4> ${itemsHtml} </div>`; orderCard.orderData = order; myOrdersListContainer.appendChild(orderCard); }); } catch (error) { console.error("Error fetching orders:", error); myOrdersListContainer.innerHTML = '<p style="color:red; text-align:center;">Could not load orders.</p>'; } }
function escapeHtml(text) {
  if (text === null || typeof text === 'undefined') return '';
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- XIII. FETCH PRODUCTS FROM FIRESTORE ---
async function fetchAndRenderStoreProducts() { if (!db) { console.error("Firestore (db) not initialized."); Object.keys(productsData).forEach(categoryKey => { const gridContainer = document.getElementById(categoryKey + '-grid'); if (gridContainer) { gridContainer.innerHTML = `<p style="color:red;">DB Error.</p>`; }}); return; } try { const snapshot = await db.collection("products").get(); const firestoreProducts = []; snapshot.forEach(doc => { firestoreProducts.push({ id: doc.id, ...doc.data() }); }); const categorizedProducts = {}; firestoreProducts.forEach(p_fs => { const productForStore = { id: p_fs.id || p_fs.firestoreDocId, title: p_fs.title || "No Title", price: typeof p_fs.price === 'number' ? p_fs.price : 0, category: p_fs.category || "uncategorized", rating: typeof p_fs.rating === 'number' ? p_fs.rating : 0, img: p_fs.image || p_fs.img || "https://via.placeholder.com/300x200?text=No+Image", image: p_fs.image || p_fs.img || "https://via.placeholder.com/300x200?text=No+Image", otherImages: (p_fs.otherImages && Array.isArray(p_fs.otherImages)) ? p_fs.otherImages : [], description: p_fs.description || "No description.", stock: typeof p_fs.stock === 'number' ? p_fs.stock : 0, customId: p_fs.id, firestoreDocId: p_fs.firestoreDocId }; if (!categorizedProducts[productForStore.category]) { categorizedProducts[productForStore.category] = []; } categorizedProducts[productForStore.category].push(productForStore); }); productsData = categorizedProducts; if (Object.keys(productsData).length > 0) { Object.keys(productsData).forEach(categoryKey => { const gridContainer = document.getElementById(categoryKey + '-grid'); if (gridContainer) { renderProducts(productsData[categoryKey], gridContainer, categoryKey); }}); } else { const productCategoriesForStore = ["electronics", "footwear", "fashion", "home-appliances", "food", "health-essentials", "beauty-products"]; productCategoriesForStore.forEach(categoryKey => { const grid = document.getElementById(categoryKey + '-grid'); if (grid) { renderProducts([], grid, categoryKey); }}); } } catch (error) { console.error("Error fetching products from Firestore:", error); const productCategoriesForStore = ["electronics", "footwear", "fashion", "home-appliances", "food", "health-essentials", "beauty-products"]; productCategoriesForStore.forEach(categoryKey => { const grid = document.getElementById(categoryKey + '-grid'); if (grid) { grid.innerHTML = `<p style="color:red;">Error loading.</p>`; }}); } }

// --- DOMContentLoaded: Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    assignZoomModalDOMElements();
    loadTempCart();
    const productCategoriesForStore = ["electronics", "footwear", "fashion", "home-appliances", "food", "health-essentials", "beauty-products"];
    productCategoriesForStore.forEach(categoryKey => { const gridContainer = document.getElementById(categoryKey + '-grid'); if (gridContainer) { renderProducts([], gridContainer, categoryKey); }});
    fetchAndRenderStoreProducts();
    if (window.location.hash === "#auth") { history.pushState("", document.title, window.location.pathname + window.location.search); if (!auth || !auth.currentUser) switchView(AUTH_PAGE); }
    else if (window.location.hash === ADMIN_LOGIN_HASH) { history.pushState("", document.title, window.location.pathname + window.location.search); switchView(AUTH_PAGE); showAdminLoginModal(); }
    newAuthSetInitialMobileState();
    setupStoreInteractions();
    setupCheckoutInteractions();
    initStoreCarousel();
    initializeThumbnailEventListeners();
    setupZoomModalEventListeners();

    if (adminLoginSubmitBtn) adminLoginSubmitBtn.addEventListener('click', () => { checkAdminCredentials(adminUsernameField.value.trim(), adminPasswordField.value.trim()); });
    if (closeAdminLoginModalBtn) { closeAdminLoginModalBtn.addEventListener('click', () => { if (adminLoginModalEl) adminLoginModalEl.style.display = 'none'; if (adminLoginErrorMsg) adminLoginErrorMsg.style.display = 'none'; if (!isAdminLoggedIn && (!auth || !auth.currentUser)) switchView(AUTH_PAGE); }); }
    if (typeof lucide !== 'undefined') lucide.createIcons(); else console.warn("Lucide library not available.");
    setTimeout(() => {
        if (auth && !auth.currentUser) {
            const anyPageVisible = Object.values(pageContainers).some(p => p && getComputedStyle(p).display !== 'none' && p.id !== AUTH_PAGE);
            const adminModalVisible = adminLoginModalEl && getComputedStyle(adminLoginModalEl).display !== 'none';
            if (!anyPageVisible && !adminModalVisible && window.location.hash !== ADMIN_LOGIN_HASH) {
                const authPageContainer = pageContainers[AUTH_PAGE];
                if (!authPageContainer || getComputedStyle(authPageContainer).display === 'none') {
                    switchView(AUTH_PAGE);
                }
            }
        }
    }, 1200);

    // --- Search Bar & Filters Logic ---
const searchBtn = document.getElementById('search-btn');
const closeSearchBtn = document.getElementById('close-search-btn');
const searchBarContainer = document.getElementById('search-bar-container');
const filtersContainer = document.getElementById('filters-container');
const searchInput = document.getElementById('search-input');
const suggestionsBox = document.getElementById('search-suggestions');
const filterCategory = document.getElementById('filter-category');
const filterPrice = document.getElementById('filter-price');

// Show/hide search bar and filters
function toggleSearchBar(show) {
    if (show) {
        searchBarContainer.classList.add('active');
        filtersContainer.style.display = 'flex';
        searchInput.focus();
        searchBtn.style.display = 'none';
        closeSearchBtn.style.display = 'flex';
    } else {
        searchBarContainer.classList.remove('active');
        filtersContainer.style.display = 'none';
        searchBtn.style.display = 'flex';
        closeSearchBtn.style.display = 'none';
        searchInput.value = '';
        suggestionsBox.classList.remove('active');
    }
}
if (searchBtn) searchBtn.addEventListener('click', () => toggleSearchBar(true));
if (closeSearchBtn) closeSearchBtn.addEventListener('click', () => toggleSearchBar(false));

// Populate category filter dynamically (if needed)
function populateCategories(products) {
    const categories = [...new Set(products.map(p => p.category))];
    filterCategory.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        filterCategory.appendChild(opt);
    });
}

// Suggestions logic
searchInput.addEventListener('input', function() {
    const val = this.value.trim().toLowerCase();
    if (!val) {
        suggestionsBox.classList.remove('active');
        suggestionsBox.innerHTML = '';
        return;
    }
    // Gather all products from all categories
    let allProducts = [];
    Object.values(productsData).forEach(arr => allProducts = allProducts.concat(arr));
    const matches = allProducts
        .filter(p => p.title.toLowerCase().includes(val))
        .slice(0, 8);
    if (matches.length) {
        suggestionsBox.innerHTML = matches.map(p =>
            `<li>${p.title}</li>`
        ).join('');
        suggestionsBox.classList.add('active');
    } else {
        suggestionsBox.classList.remove('active');
        suggestionsBox.innerHTML = '';
    }
});

// Click suggestion to search
suggestionsBox.addEventListener('click', function(e) {
    if (e.target.tagName === 'LI') {
        searchInput.value = e.target.textContent;
        suggestionsBox.classList.remove('active');
        triggerSearch();
    }
});

// Filter logic for search results page
filterCategory.addEventListener('change', triggerSearch);
filterPrice.addEventListener('change', triggerSearch);
searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        suggestionsBox.classList.remove('active');
        triggerSearch();
    }
});

function triggerSearch() {
    const searchVal = searchInput.value.trim().toLowerCase();
    const catVal = filterCategory.value;
    const priceVal = filterPrice.value;
    let allProducts = [];
    Object.values(productsData).forEach(arr => allProducts = allProducts.concat(arr));
    let filtered = allProducts.filter(p =>
        (!searchVal || p.title.toLowerCase().includes(searchVal)) &&
        (!catVal || p.category === catVal)
    );
    if (priceVal) {
        const [min, max] = priceVal.split('-').map(Number);
        filtered = filtered.filter(p => p.price >= min && p.price <= max);
    }
    showSearchResultsPage(searchInput.value, filtered); // <-- FIXED
}

// Show results on dedicated page
function showSearchResultsPage(searchTerm, filteredProducts) {
    switchView('search-results-page-container');
    document.getElementById('search-term').textContent = searchTerm;
    renderProducts(filteredProducts, document.getElementById('search-results-grid'));
}

// Back to store button
document.getElementById('back-to-store-btn')?.addEventListener('click', () => {
    switchView('store-page-container');
    // Optionally hide search bar and filters
    document.getElementById('search-bar-container').classList.remove('active');
    document.getElementById('filters-container').style.display = 'none';
});
document.getElementById('search-back-to-store-btn')?.addEventListener('click', () => {
    switchView('store-page-container');
    // Optionally hide search bar and filters
    document.getElementById('search-bar-container').classList.remove('active');
    document.getElementById('filters-container').style.display = 'none';
});

// --- My Orders: Click to view details ---
const myOrdersListContainer = document.getElementById('my-orders-list-container');
const orderDetailsModal = document.getElementById('order-details-modal');
const orderDetailsContent = document.getElementById('order-details-content');
const closeOrderDetailsModalBtn = document.getElementById('close-order-details-modal');

if (myOrdersListContainer && orderDetailsModal && orderDetailsContent && closeOrderDetailsModalBtn) {
    myOrdersListContainer.addEventListener('click', function(e) {
        const card = e.target.closest('.my-order-card');
        if (!card) return;
        const order = card.orderData;
        if (order) showOrderDetailsModal(order);
    });

    function showOrderDetailsModal(order) {
        let html = `
            <div><strong>Order ID:</strong> ${escapeHtml(order.orderId || order.id)}</div>
            <div><strong>Date:</strong> ${order.timestamp ? new Date(order.timestamp.toDate()).toLocaleString() : 'N/A'}</div>
            <div><strong>Status:</strong> ${escapeHtml(order.status)}</div>
            <div><strong>Shipping To:</strong> ${escapeHtml(order.shippingDetails.name)}, ${escapeHtml(order.shippingDetails.address)}, ${escapeHtml(order.shippingDetails.city)}, ${escapeHtml(order.shippingDetails.postal)}</div>
            <div><strong>Payment:</strong> ${escapeHtml(order.paymentMethodDisplay)}</div>
            <h3 style="margin-top:18px;">Ordered Products</h3>
            <table>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Title</th>
                  <th>Qty</th>
                  <th>Price (₹)</th>
                  <th>Subtotal (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${(order.items || []).map(item => `
                  <tr>
                    <td>
                      <a href="#" class="order-product-link" data-product-id="${item.id}">
                        <img src="${escapeHtml(item.image || item.img || 'https://via.placeholder.com/60x60?text=No+Image')}" alt="${escapeHtml(item.title)}" style="width:60px;height:60px;object-fit:contain;border-radius:6px;background:#222;">
                      </a>
                    </td>
                    <td>${escapeHtml(item.title)}</td>
                    <td>${item.quantity}</td>
                    <td>₹${Number(item.price).toLocaleString('en-IN')}</td>
                    <td>₹${Number(item.price * item.quantity).toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div style="margin-top:12px;"><strong>Total:</strong> ₹${Number(order.total).toLocaleString('en-IN')}</div>
        `;
        orderDetailsContent.innerHTML = html;
        orderDetailsModal.style.display = 'flex';
        orderDetailsModal.focus();

        // Only open product detail page on image click
        orderDetailsContent.querySelectorAll('.order-product-link img').forEach(img => {
            img.addEventListener('click', function(e) {
                e.preventDefault();
                const productId = this.closest('.order-product-link').getAttribute('data-product-id');
                if (productId) {
                    orderDetailsModal.style.display = 'none';
                    showProductDetail(productId);
                }
            });
        });
    }

    closeOrderDetailsModalBtn.addEventListener('click', () => {
        orderDetailsModal.style.display = 'none';
        orderDetailsContent.innerHTML = '';
    });
    orderDetailsModal.addEventListener('click', (e) => {
        if (e.target === orderDetailsModal) {
            orderDetailsModal.style.display = 'none';
            orderDetailsContent.innerHTML = '';
        }
    });
} // <-- This closes the if (myOrdersListContainer && ...) block

// --- Order Image Zoom Logic ---
const orderImageZoomModal = document.getElementById('order-image-zoom-modal');
const orderZoomedImage = document.getElementById('order-zoomed-image');
let zoomLevel = 1, isDragging = false, dragStart = {x:0, y:0}, imgOffset = {x:0, y:0};

function openOrderImageZoom(src, alt) {
    if (!orderImageZoomModal || !orderZoomedImage) return;
    orderZoomedImage.src = src;
    orderZoomedImage.alt = alt || '';
    zoomLevel = 1;
    imgOffset = {x:0, y:0};
    orderZoomedImage.style.transform = 'scale(1) translate(0px,0px)';
    orderImageZoomModal.classList.add('active');
    orderImageZoomModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeOrderImageZoom() {
    orderImageZoomModal.classList.remove('active');
    orderImageZoomModal.style.display = 'none';
    document.body.style.overflow = '';
}

if (orderImageZoomModal && orderZoomedImage) {
    // Mouse wheel or pinch to zoom
    orderZoomedImage.addEventListener('wheel', function(e) {
        e.preventDefault();
        let delta = e.deltaY < 0 ? 0.15 : -0.15;
        zoomLevel = Math.min(Math.max(zoomLevel + delta, 1), 4);
        orderZoomedImage.style.transform = `scale(${zoomLevel}) translate(${imgOffset.x}px,${imgOffset.y}px)`;
    }, { passive: false });

    // Touch pinch to zoom
    let lastDist = null;
    orderZoomedImage.addEventListener('touchmove', function(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (lastDist) {
                let delta = (dist - lastDist) / 200;
                zoomLevel = Math.min(Math.max(zoomLevel + delta, 1), 4);
                orderZoomedImage.style.transform = `scale(${zoomLevel}) translate(${imgOffset.x}px,${imgOffset.y}px)`;
            }
            lastDist = dist;
        }
    }, { passive: false });
    orderZoomedImage.addEventListener('touchend', function(e) { lastDist = null; });

    // Drag to pan
    orderZoomedImage.addEventListener('mousedown', function(e) {
        if (zoomLevel === 1) return;
        isDragging = true;
        dragStart = { x: e.clientX, y: e.clientY };
        orderZoomedImage.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        let dx = e.clientX - dragStart.x;
        let dy = e.clientY - dragStart.y;
        imgOffset.x += dx;
        imgOffset.y += dy;
        dragStart = { x: e.clientX, y: e.clientY };
        orderZoomedImage.style.transform = `scale(${zoomLevel}) translate(${imgOffset.x}px,${imgOffset.y}px)`;
    });
    document.addEventListener('mouseup', function() {
        isDragging = false;
        orderZoomedImage.style.cursor = 'grab';
    });

    // Touch drag to pan
    orderZoomedImage.addEventListener('touchstart', function(e) {
        if (zoomLevel === 1 || e.touches.length !== 1) return;
        isDragging = true;
        dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: false });
    orderZoomedImage.addEventListener('touchmove', function(e) {
        if (!isDragging || e.touches.length !== 1) return;
        let dx = e.touches[0].clientX - dragStart.x;
        let dy = e.touches[0].clientY - dragStart.y;
        imgOffset.x += dx;
        imgOffset.y += dy;
        dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        orderZoomedImage.style.transform = `scale(${zoomLevel}) translate(${imgOffset.x}px,${imgOffset.y}px)`;
    }, { passive: false });
    orderZoomedImage.addEventListener('touchend', function() { isDragging = false; });

    // Click/tap outside or on image to close
    orderImageZoomModal.addEventListener('click', function(e) {
        if (e.target === orderImageZoomModal || e.target === orderZoomedImage) closeOrderImageZoom();
    });
}

// Attach to order modal images
document.addEventListener('click', function(e) {
    const img = e.target.closest('.order-product-link img');
    if (img) {
        e.preventDefault();
        openOrderImageZoom(img.src, img.alt);
    }
});

document.getElementById('main-product-image')?.addEventListener('click', function() {
    openImageZoom(this.src, this.alt);
});

document.getElementById('about-bazarooo-link')?.addEventListener('click', function(e) {
    e.preventDefault();
    history.replaceState(null, '', window.location.pathname + window.location.search); // Remove hash if any
    switchView('auth-page-container');
    showAdminLoginModal(); // This should open your admin modal
});
});
