import { lookup } from 'node:dns/promises';
import { Agent } from 'undici';
import { isIP } from 'node:net';

export function publicAddress(address) {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && [0, 168].includes(b) || a === 100 && b >= 64 && b <= 127 || a === 198 && [18, 19, 51].includes(b) || a === 203 && b === 0);
  }
  // Global unicast IPv6 only; mapped IPv4 and local/link-local ranges fail closed.
  return isIP(address) === 6 && /^[23][0-9a-f]{3}:/i.test(address) && !/^2001:db8:/i.test(address);
}
export async function validatePublicProvider(value) {
  let url; try { url = new URL(value); } catch { throw new Error('Enter a valid provider URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443') throw new Error('Hosted Forma requires a public HTTPS API URL.');
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => !publicAddress(address))) throw new Error('Hosted Forma cannot connect to private or local network addresses.');
  // Pin the verified addresses through the actual connection to prevent DNS rebinding.
  return new Agent({ connect: { lookup: (_host, options, callback) => {
    const candidates = addresses.filter(a => !options.family || a.family === options.family);
    if (!candidates.length) return callback(new Error('No public address for this provider.'));
    callback(null, options.all ? candidates : candidates[0].address, candidates[0].family);
  } } });
}
