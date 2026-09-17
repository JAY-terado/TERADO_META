import React from 'react';
import { useBrokerConnect } from '../../context/BrokerConnectContext';
import { Smartphone, Laptop, RefreshCw, Layers } from 'lucide-react';
import Swal from 'sweetalert2';

interface DeviceSimulatorProps {
  children: React.ReactNode;
}

export const DeviceSimulator: React.FC<DeviceSimulatorProps> = ({ children }) => {
  const { 
    deviceMode, setDeviceMode, 
    resetSimulation 
  } = useBrokerConnect();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Simulation Controls Top Toolbar */}
      <header className="bg-slate-900 border-b border-slate-800 text-white px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 relative z-30 select-none shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping"></div>
          <h1 className="text-sm font-extrabold tracking-tight">BrokerConnect Interactive Simulator</h1>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          {/* Device toggle controls */}
          <div className="flex bg-slate-850 rounded-xl p-1 border border-slate-700/50">
            <button
              onClick={() => setDeviceMode('responsive')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                deviceMode === 'responsive' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Responsive Viewport"
            >
              <Layers className="w-4 h-4" />
              <span>Full Screen</span>
            </button>
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                deviceMode === 'desktop' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Lock Desktop dimensions"
            >
              <Laptop className="w-4 h-4" />
              <span>Desktop</span>
            </button>
            <button
              onClick={() => setDeviceMode('mobile')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                deviceMode === 'mobile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Lock Smartphone dimensions"
            >
              <Smartphone className="w-4 h-4" />
              <span>Mobile</span>
            </button>
          </div>

          {/* Reset simulation */}
          <button
            onClick={() => {
              resetSimulation();
              Swal.fire({
                title: 'Simulator Reset',
                text: 'Simulation state reset to default mock values.',
                icon: 'success',
                confirmButtonColor: '#3B82F6'
              });
            }}
            className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded-xl transition cursor-pointer"
            title="Reset data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>
        </div>
      </header>

      {/* Simulator canvas workspace area */}
      <main className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        {deviceMode === 'mobile' ? (
          /* Phone mock border */
          <div className="w-[390px] h-[800px] bg-slate-950 rounded-[50px] border-[10px] border-slate-800 shadow-2xl flex flex-col overflow-hidden relative ring-4 ring-slate-900/30">
            {/* Camera notch cutout */}
            <div className="absolute top-0 inset-x-0 mx-auto w-32 h-6 bg-slate-800 rounded-b-2xl z-50 flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-900 mr-2"></div>
              <div className="w-8 h-1 bg-slate-700/50 rounded-full"></div>
            </div>

            {/* Mobile Status bar */}
            <div className="bg-slate-900 text-white h-7 flex items-center justify-between px-6 text-[10px] font-bold select-none shrink-0 pt-1">
              <span>05:30 PM</span>
              <div className="flex items-center gap-1.5">
                <span>5G</span>
                <span className="w-4 h-2 border border-white/80 rounded-sm inline-block relative after:content-[''] after:absolute after:-right-0.5 after:top-0.5 after:w-0.5 after:h-0.5 after:bg-white"></span>
              </div>
            </div>

            {/* Children viewport */}
            <div className="flex-1 bg-slate-50 overflow-y-auto relative flex flex-col">
              {children}
            </div>
          </div>
        ) : deviceMode === 'desktop' ? (
          /* Locked Desktop dimensions view frame */
          <div className="w-full max-w-5xl h-[700px] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            {/* Browser frame title bar */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center gap-2 select-none shrink-0">
              <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
              <span className="text-[10px] text-slate-400 font-bold ml-4">https://app.brokerconnect.io/portal</span>
            </div>

            <div className="flex-1 overflow-hidden relative">
              {children}
            </div>
          </div>
        ) : (
          /* Normal responsive container */
          <div className="w-full h-full max-w-7xl mx-auto bg-white rounded-2xl border border-slate-200/60 shadow-lg overflow-hidden flex flex-col min-h-[85vh]">
            {children}
          </div>
        )}
      </main>
    </div>
  );
};
