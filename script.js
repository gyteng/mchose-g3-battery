let devices = new Set();

async function requestDevice() {
    try {
        const device = await navigator.hid.requestDevice({
            filters: [{
                vendorId: 9610,
                productId: 312
            }]
        });
        
        devices.clear();
        
        if (device.length > 0) {
            device.forEach(async (d) => {
                if (d.collections.length > 1) {
                    devices.add(d);
                }
                if (!d.opened) {
                    await d.open();
                }
                updateDeviceList();
            });
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('status').textContent = `Error: ${error.message}`;
    }
}

async function updateDeviceList() {
    // console.log('updateDeviceList');
    const deviceList = document.getElementById('deviceList');
    deviceList.innerHTML = '';

    devices.forEach(device => {
        const li = document.createElement('li');
        li.className = 'device-item';
        li.innerHTML = `
            <div>
                <strong>Device:</strong> ${device.productName || 'Unknown Device'}
                <span class="battery-level">Checking battery...</span>
            </div>
            <div>Vendor ID: ${device.vendorId}, Product ID: ${device.productId}</div>
        `;
        deviceList.appendChild(li);
        getBatteryLevel(device, li);
    });
}

async function getBatteryLevel(device, listItem) {
    console.log('getBatteryLevel', device, listItem);

    // 创建一个函数来更新显示
    const updateDisplay = (data) => {
        console.log('Battery data:', {
            data: Array.from(data).map((byte, index) => `Byte ${index}: ${byte} (${byte.toString(16)}h)`)
        });
        
        // 根据观察，Byte 2 (index: 2) 包含电池电量
        const batteryLevel = data[8];
        
        const batterySpan = listItem.querySelector('.battery-level');
        if (batterySpan) {
            batterySpan.innerHTML = `
                <div style="margin-bottom: 10px">
                    <strong>Battery Level: ${batteryLevel}%</strong>
                </div>
                <div style="font-size: 0.9em; color: #666;">
                    Raw Data: ${Array.from(data).map((byte, index) => `<br>Byte ${index}: ${byte} (${byte.toString(16)}h)`).join('')}
                </div>
            `;
        }
    };

    try {
        // 尝试主动获取电池电量
        const requestBattery = async () => {
            try {
                const report = await device.receiveFeatureReport(0x09);
                const data = new Uint8Array(report.buffer);
                updateDisplay(data);
            } catch (e) {
                console.log('Receive feature report failed:', e);
            }
        };

        // 添加刷新按钮
        const refreshButton = document.createElement('button');
        refreshButton.textContent = 'Refresh Battery';
        refreshButton.style.marginLeft = '10px';
        refreshButton.onclick = requestBattery;
        
        // 将刷新按钮添加到设备列表项中
        const deviceInfo = listItem.querySelector('div');
        if (deviceInfo) {
            deviceInfo.appendChild(refreshButton);
        }

        // 首次连接时尝试获取电池电量
        await requestBattery();

    } catch (error) {
        console.error('Error reading battery level:', error);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('requestDevice').addEventListener('click', requestDevice);
    
    navigator.hid.getDevices().then(existingDevices => {
        console.log('Existing devices:', existingDevices);
        existingDevices.forEach(async (device) => {
            if (!device.opened) {
                await device.open();
            }
            if (device.collections.length > 1) {
                devices.add(device);
            }
            updateDeviceList();
        });
    });
});
