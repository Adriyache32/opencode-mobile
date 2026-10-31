// Generación de códigos QR para emparejamiento
import QRCode from 'qrcode';

export interface PairPayload {
  v: 1;
  url: string;
  token: string;
  name: string;
}

export function buildPayload(url: string, token: string, name: string): PairPayload {
  return { v: 1, url, token, name };
}

/** QR en ASCII para la terminal. */
export async function renderTerminalQR(payload: PairPayload): Promise<string> {
  return QRCode.toString(JSON.stringify(payload), { type: 'terminal', small: true });
}

/** QR como data URL (PNG) para mostrarlo en una página web. */
export async function renderDataURL(payload: PairPayload): Promise<string> {
  return QRCode.toDataURL(JSON.stringify(payload), { width: 320, margin: 2 });
}