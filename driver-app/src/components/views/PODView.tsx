"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Camera, 
  PenTool, 
  Barcode, 
  CheckCircle2,
  RotateCcw,
  Save,
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { Html5QrcodeScanner } from "html5-qrcode";
import GlassCard from "@/components/ui/GlassCard";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function PODView() {
  const { id } = useParams();
  const router = useRouter();
  const [delivery, setDelivery] = useState<any>(null);
  const [step, setStep] = useState<'scan' | 'signature' | 'photo' | 'success'>('scan');
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const sigCanvas = useRef<SignatureCanvas | null>(null);

  useEffect(() => {
    if (!id) return;
    async function fetchDelivery() {
      const { data } = await supabase.from('deliveries').select(`*, orders(*)` ).eq('id', id).single();
      if (data) setDelivery(data);
    }
    fetchDelivery();
  }, [id]);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (step === 'scan' && !scannedCode) {
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render((result) => {
        setScannedCode(result);
        if (scanner) scanner.clear();
        setStep('signature');
      }, (err) => {});
      return () => {
        if (scanner) scanner.clear().catch(err => console.error(err));
      };
    }
  }, [step, scannedCode]);

  const clearSignature = () => sigCanvas.current?.clear();

  const handleComplete = async () => {
    const signatureData = sigCanvas.current?.toDataURL();
    await supabase.from('deliveries').update({ status: 'delivered', completed_at: new Date().toISOString(), pod_signature: signatureData }).eq('id', id);
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', delivery.order_id);
    setStep('success');
  };

  return (
    <div className="flex-1 flex flex-col p-6 gap-8 pb-12">
      <header className="flex justify-between items-center animate-fade-in">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full glass flex items-center justify-center text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">Proof of Delivery</h1>
        <div className="w-10 h-10" />
      </header>
      <div className="flex justify-between items-center px-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {[
          { label: 'Scan', icon: <Barcode size={16} />, active: step === 'scan', done: !!scannedCode },
          { label: 'Sign', icon: <PenTool size={16} />, active: step === 'signature', done: step === 'photo' || step === 'success' },
          { label: 'Photo', icon: <Camera size={16} />, active: step === 'photo', done: step === 'success' }
        ].map((s, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
              s.active ? "border-blue-500 bg-blue-500/10 text-blue-500 scale-110 shadow-lg shadow-blue-500/20" : 
              s.done ? "border-green-500 bg-green-500/10 text-green-500" : "border-white/10 text-neutral-600"
            }`}>
              {s.done ? <CheckCircle2 size={18} /> : s.icon}
            </div>
            <span className={`text-[10px] uppercase font-bold tracking-widest ${s.active ? "text-white" : "text-neutral-600"}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
      <div className="flex-1 flex flex-col justify-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <AnimatePresence mode="wait">
          {step === 'scan' && (
            <motion.div key="scan" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <GlassCard className="!p-0 overflow-hidden">
                <div id="reader" className="w-full aspect-square bg-black"></div>
                <div className="p-6 text-center">
                  <h3 className="text-lg font-bold text-white mb-2">Scan Package Tag</h3>
                  <p className="text-sm text-neutral-500">Align the QR code/barcode within the frame to verify the delivery item.</p>
                </div>
              </GlassCard>
              <button onClick={() => { setScannedCode('MOCK-CODE-123'); setStep('signature'); }} className="btn-secondary text-[10px] text-neutral-500 py-2">
                Skip Scan (Mock for Demo)
              </button>
            </motion.div>
          )}
          {step === 'signature' && (
            <motion.div key="sign" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Recipient Signature</h3>
                <p className="text-sm text-neutral-500">Ask the customer to sign here</p>
              </div>
              <div className="relative glass rounded-2xl bg-white/[0.02] border-white/20 overflow-hidden touch-none">
                <SignatureCanvas ref={sigCanvas} penColor="white" canvasProps={{ className: "w-full min-h-[300px]", }} />
                <button onClick={clearSignature} className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white">
                  <RotateCcw size={18} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button className="btn-secondary" onClick={() => setStep('scan')}>Back</button>
                <button className="btn-primary" onClick={() => setStep('photo')}>Confirm Sign</button>
              </div>
            </motion.div>
          )}
          {step === 'photo' && (
            <motion.div key="photo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Delivery Photo</h3>
                <p className="text-sm text-neutral-500">Evidence of delivery at the doorstep</p>
              </div>
              <div className="aspect-[4/3] rounded-2xl glass border-dashed border-white/20 flex flex-col items-center justify-center bg-white/[0.01]">
                {isCapturing ? (
                  <div className="text-center animate-pulse">
                    <Camera size={48} className="text-blue-500 mb-4 mx-auto" />
                    <p className="text-sm font-bold text-blue-500">Camera Active...</p>
                  </div>
                ) : (
                  <button onClick={() => setIsCapturing(true)} className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-neutral-600">
                      <Camera size={32} />
                    </div>
                    <p className="text-sm font-bold text-neutral-500">Tap to Capture Photo</p>
                  </button>
                )}
              </div>
              <button className="btn-primary" onClick={handleComplete}>
                <Save size={20} />
                Submit All Details
              </button>
            </motion.div>
          )}
          {step === 'success' && (
            <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-6 py-12">
              <div className="w-24 h-24 rounded-full bg-green-500/10 border-4 border-green-500/50 flex items-center justify-center mx-auto mb-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
                  <CheckCircle2 size={48} className="text-green-500" />
                </motion.div>
              </div>
              <div>
                <h3 className="text-3xl font-bold mb-2">Success!</h3>
                <p className="text-neutral-500">Delivery details have been synced.</p>
              </div>
              <button onClick={() => router.push('/')} className="btn-primary">Back to Dashboard</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
