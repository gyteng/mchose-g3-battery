<script>
  import { onMount, onDestroy } from 'svelte';

  let devices = new Set();
  let status = '';
  let refreshIntervals = new Map();

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
        for (const d of device) {
          if (d.collections.length > 1) {
            if (!d.opened) {
              await d.open();
            }
            devices.add(d);
            devices = devices; // trigger Svelte reactivity
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      status = `Error: ${error.message}`;
    }
  }

  async function getBatteryLevel(device) {
    const requestBattery = async () => {
      try {
        const report = await device.receiveFeatureReport(0x09);
        const data = new Uint8Array(report.buffer);
        return {
          batteryLevel: data[8],
          rawData: Array.from(data)
        };
      } catch (e) {
        console.log('Receive feature report failed:', e);
        return null;
      }
    };

    // 首次获取电池电量
    const batteryData = await requestBattery();
    if (batteryData) {
      document.title = `${batteryData.batteryLevel}% - G3 Battery`;
    }

    // 设置90秒自动刷新
    if (!refreshIntervals.has(device.productId)) {
      const refreshInterval = setInterval(async () => {
        const newData = await requestBattery();
        if (newData) {
          devices = devices; // trigger update
          document.title = `${newData.batteryLevel}% - G3 Battery`;
        }
      }, 90000);
      refreshIntervals.set(device.productId, refreshInterval);
    }

    return {
      batteryData,
      refresh: requestBattery
    };
  }

  function cleanupDevice(deviceId) {
    const interval = refreshIntervals.get(deviceId);
    if (interval) {
      clearInterval(interval);
      refreshIntervals.delete(deviceId);
    }
  }

  onMount(async () => {
    // Check for any previously connected devices
    const existingDevices = await navigator.hid.getDevices();
    for (const device of existingDevices) {
      if (device.collections.length > 1) {
        if (!device.opened) {
          await device.open();
        }
        devices.add(device);
        devices = devices; // trigger Svelte reactivity
      }
    }
  });

  onDestroy(() => {
    // Cleanup all intervals when component is destroyed
    for (const interval of refreshIntervals.values()) {
      clearInterval(interval);
    }
    refreshIntervals.clear();
  });

  $: {
    // Watch devices Set for changes and cleanup removed devices
    const currentDeviceIds = new Set([...devices].map(d => d.productId));
    for (const [deviceId] of refreshIntervals) {
      if (!currentDeviceIds.has(deviceId)) {
        cleanupDevice(deviceId);
      }
    }
  }
</script>

<main>
  <div class="container">
    <h1>G3 Battery Status</h1>
    <button on:click={requestDevice}>Connect to HID Device</button>
    {#if status}
      <div id="status">{status}</div>
    {/if}
    <ul id="deviceList">
      {#each [...devices] as device (device.productId)}
        <li class="device-item">
          <div>
            <strong>Device:</strong> {device.productName || 'Unknown Device'}
            <span class="battery-level">
              {#await getBatteryLevel(device)}
                Checking battery...
              {:then batteryInfo}
                {#if batteryInfo?.batteryData}
                  <div style="margin-bottom: 10px">
                    <strong>Battery Level: {batteryInfo.batteryData.batteryLevel}%</strong>
                  </div>
                  <button on:click={batteryInfo.refresh} style="margin-left: 10px">
                    Refresh
                  </button>
                {/if}
              {/await}
            </span>
          </div>
          <div>Vendor ID: {device.vendorId}, Product ID: {device.productId}</div>
        </li>
      {/each}
    </ul>
  </div>
</main>

<style>
  :global(body) {
    font-family: Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f5f5f5;
  }
  .container {
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  button {
    background-color: #4CAF50;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    margin-bottom: 20px;
  }
  button:hover {
    background-color: #45a049;
  }
  #deviceList {
    list-style: none;
    padding: 0;
  }
  .device-item {
    background-color: #f9f9f9;
    padding: 15px;
    margin: 10px 0;
    border-radius: 4px;
    border: 1px solid #ddd;
  }
  .battery-level {
    display: inline-block;
    margin-left: 10px;
    padding: 3px 8px;
    background-color: #e8f5e9;
    border-radius: 3px;
    color: #2e7d32;
  }
</style>
