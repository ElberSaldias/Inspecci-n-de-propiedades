import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { useInspectionStore } from '../store/useInspectionStore';
import { Loader2, Eraser, CheckCircle2 } from 'lucide-react';

const Signatures: React.FC = () => {
    const navigate = useNavigate();
    const {
        selectedUnit, processType, clearSession, submitInspection
    } = useInspectionStore();
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');

    const repSigPad = useRef<SignatureCanvas>(null);
    const cliSigPad = useRef<SignatureCanvas>(null);

    useEffect(() => {
        if (!selectedUnit) {
            navigate('/identify');
        }
    }, [selectedUnit, navigate]);

    const handleClearRep = () => repSigPad.current?.clear();
    const handleClearCli = () => cliSigPad.current?.clear();

    const handleFinalize = async () => {
        if (repSigPad.current?.isEmpty() || cliSigPad.current?.isEmpty()) {
            alert("Ambas firmas son obligatorias para generar el acta.");
            return;
        }

        setIsSubmitting(true);

        const repSignature = repSigPad.current?.toDataURL("image/png");
        const cliSignature = cliSigPad.current?.toDataURL("image/png");

        try {
            const response = await submitInspection({
                firmas: {
                    cliente: cliSignature,
                    representante: repSignature
                }
            });

            if (response.ok) {
                if (response.pdf_url) {
                    setPdfUrl(response.pdf_url);
                    window.open(response.pdf_url, '_blank');
                }
                setShowSuccess(true);
            } else {
                alert(`❌ No se pudo enviar el acta. Intente nuevamente.\nDetalle: ${response.error || 'Respuesta fallida del servidor'}`);
            }
        } catch (error: any) {
            console.error("Error submitting signatures:", error);
            alert(`❌ No se pudo enviar el acta. Intente nuevamente.\nDetalle: ${error.message || 'Error desconocido'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFinish = () => {
        clearSession();
        navigate('/');
    };

    if (!selectedUnit) return null;

    if (showSuccess) {
        return (
            <div className="flex flex-col items-center justify-center h-full pt-20 animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={48} />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2 text-center">✅ Acta generada correctamente</h1>
                <p className="text-slate-500 text-center max-w-md mb-8">
                    El acta de {processType === 'PRE_ENTREGA' ? 'Pre-Entrega' : 'Entrega Final'} para la unidad {selectedUnit.number} ha sido guardada.
                </p>

                {pdfUrl && (
                    <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white border-2 border-primary-600 text-primary-600 font-bold py-3 px-8 rounded-xl hover:bg-primary-50 transition-colors mb-4 block"
                    >
                        Ver Documento PDF
                    </a>
                )}

                <button
                    onClick={handleFinish}
                    className="bg-primary-600 text-white font-semibold py-3 px-8 rounded-xl hover:bg-primary-700 transition-colors"
                >
                    Volver al Inicio
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300 max-w-lg mx-auto w-full pt-4">
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Paso Final: Firmas</h1>
                <p className="text-slate-500">
                    Firma del acta en señal de conformidad con lo registrado.
                </p>
            </div>

            <div className="space-y-6 flex-1">
                {/* Representative Signature */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <p className="font-bold text-slate-800">Representante Inmobiliaria</p>
                            <p className="text-xs text-slate-500">Roberto (Inspector)</p>
                        </div>
                        <button onClick={handleClearRep} className="text-slate-400 hover:text-red-500 flex items-center gap-1 text-sm font-medium">
                            <Eraser size={16} /> Limpiar
                        </button>
                    </div>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 overflow-hidden" style={{ touchAction: 'none' }}>
                        <SignatureCanvas
                            ref={repSigPad}
                            penColor="black"
                            canvasProps={{ className: 'w-full h-40' }}
                        />
                    </div>
                </div>

                {/* Client Signature */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <p className="font-bold text-slate-800">Cliente Recibidor</p>
                            <p className="text-xs text-slate-500">{selectedUnit.ownerName}</p>
                        </div>
                        <button onClick={handleClearCli} className="text-slate-400 hover:text-red-500 flex items-center gap-1 text-sm font-medium">
                            <Eraser size={16} /> Limpiar
                        </button>
                    </div>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 overflow-hidden" style={{ touchAction: 'none' }}>
                        <SignatureCanvas
                            ref={cliSigPad}
                            penColor="blue"
                            canvasProps={{ className: 'w-full h-40' }}
                        />
                    </div>
                </div>
            </div>

            <div className="mt-8 pb-8">
                <button
                    onClick={handleFinalize}
                    disabled={isSubmitting}
                    className="w-full bg-slate-900 text-white font-bold py-4 px-6 rounded-xl hover:bg-slate-800 transition-colors shadow-md text-lg disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="animate-spin" size={24} />
                            <span>Generando acta...</span>
                        </>
                    ) : (
                        <span>Finalizar y Generar Acta</span>
                    )}
                </button>
            </div>
        </div>
    );
};

export default Signatures;
