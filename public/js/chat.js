const socket = io();

// Elements
const $messageForm = document.querySelector('#message-form');
const $messageFormInput = $messageForm.querySelector('input');
const $messageFormButton = $messageForm.querySelector('button');
const $sendLocationButton = document.querySelector('#send-location');
const $messages = document.querySelector('#message');

// Templates
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locaiotnTemplate = document.querySelector('#location-message-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true }); //{ ignoreQueryPrefix: true } 去掉"?"

const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild;

    // Height of the message
    const newMessageStyles = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

    // Visiable height
    const visibleHeight = $messages.offsetHeight;

    // Height of message container
    const containerHeight = $messages.scrollHeight;

    //How far have I scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight;

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight;
    }


};

//message
socket.on('message', (message) => {
    console.log(message);
    const html = Mustache.render(messageTemplate, { //傳遞資料給index.html
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('hh:mm a') //使用moment library
    });
    $messages.insertAdjacentHTML("beforeend", html); //before:訊息會往下疊 after:訊息往上疊
    autoscroll();
});

//locationMessage
socket.on('locationMessage', (message) => {
    console.log(message);
    const html = Mustache.render(locaiotnTemplate, { //傳遞資料給index.html
        username: message.username,
        url: message.url,
        createdAt: moment(message.createdAt).format('hh:mm a')
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

//roomData
socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    });
    document.querySelector('#sidebar').innerHTML = html;
});

$messageForm.addEventListener('submit', (e) => { //e: event
    e.preventDefault(); //讓browser不重新刷新

    $messageFormButton.setAttribute('disabled', 'disabled');//送出後先把button disable
    
    const sendMessage = e.target.elements.message.value; //對應到
    socket.emit('sendMessage', sendMessage, (error) => { //最後的arrow function 是用來確認server是否有收到 "acknowledgments"
        $messageFormButton.removeAttribute('disabled'); //訊息送出後再重新enable
        $messageFormInput.value = '';//訊息送出後 清除輸入欄
        $messageFormInput.focus();////訊息送出後 將網頁focus在欄內 所以可以繼續寫訊息

        if (error) {
            return console.log(error);
        }

        console.log('Message delivered!');
    });
});


$sendLocationButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
        return alert('Geolocation is not supported by your browser.');
    }

    $sendLocationButton.setAttribute('disabled', 'disabled');//送出後先把button disable

    navigator.geolocation.getCurrentPosition((position) => {

        socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, () => { //acknowledgments
            console.log('Location shared!');
            $sendLocationButton.removeAttribute('disabled'); //訊息送出後再重新enable
        });
    });
});

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error);
        location.href = '/'; //送使用者回到首頁
    }
});