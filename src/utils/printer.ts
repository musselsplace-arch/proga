import { Order, CartItem, PrinterState } from '../types';

/**
 * Maps Georgian characters to Latin equivalent so standard thermal receipt 
 * printers that do not have Georgian fonts preloaded can still print readable receipts.
 */
export function transliterateGeorgian(text: string): string {
  const geoMap: { [key: string]: string } = {
    'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e', 'ვ': 'v', 'ზ': 'z',
    'თ': 't', 'ი': 'i', 'კ': 'k', 'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o',
    'პ': 'p', 'ჟ': 'zh', 'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u', 'ფ': 'p',
    'ქ': 'k', 'ღ': 'gh', 'ყ': 'q', 'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz',
    'წ': 'ts', 'ჭ': 'ch', 'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h',
    'ა́': 'a', 'ე́': 'e', 'ი́': 'i', 'ო́': 'o', 'უ́': 'u',
  };
  
  // Also support old uppercase and general Georgian script variants
  return text.split('').map(char => {
    const lower = char.toLowerCase();
    const mapped = geoMap[lower];
    if (mapped !== undefined) {
      return char === lower ? mapped : mapped.toUpperCase();
    }
    return char;
  }).join('');
}

/**
 * Format helper for text printer lines. 
 * Formats "Item Name              10.00 ₾" cleanly with spaces inside wide terminal
 */
export function padRow(left: string, right: string, columns: number = 32): string {
  const spaceNeeded = columns - left.length - right.length;
  if (spaceNeeded <= 0) {
    return left.substring(0, columns - right.length - 1) + ' ' + right;
  }
  return left + ' '.repeat(spaceNeeded) + right;
}

/**
 * Returns a beautifully styled text receipt for a paper width
 */
export function generateTextReceipt(order: Order, printWidth: '58mm' | '80mm', encoding: 'utf8' | 'translit' | 'english'): string {
  const columns = printWidth === '58mm' ? 32 : 48;
  const lines: string[] = [];
  
  const prepareText = (geoText: string, engText: string) => {
    if (encoding === 'english') {
      return engText;
    }
    if (encoding === 'translit') {
      return transliterateGeorgian(geoText);
    }
    return geoText;
  };

  const hr = '='.repeat(columns);
  const dashedHr = '-'.repeat(columns);

  // App Title
  lines.push(centerText('BLACK CAT', columns));
  lines.push(centerText(prepareText('თბილისი, საქართველო', 'Tbilisi, Georgia'), columns));
  lines.push(dashedHr);

  // Metadata
  lines.push(padRow(prepareText('ჩეკი:', 'Receipt:'), `#${order.orderNumber}`, columns));
  lines.push(padRow(prepareText('თარიღი:', 'Date:'), formatDate(order.timestamp), columns));
  lines.push(padRow(prepareText('მაგიდა:', 'Table:'), order.tableNumber.toString(), columns));
  lines.push(padRow(prepareText('მოლარე:', 'Cashier:'), prepareText(order.cashierName, 'Admin'), columns));
  lines.push(hr);

  // Items
  order.items.forEach((item: CartItem) => {
    const optionLabel = item.selectedOption === 'glass' ? ' (Gl)' : item.selectedOption === 'bottle' ? ' (Bt)' : '';
    const nameStr = prepareText(item.menuItem.nameKa, item.menuItem.nameEn) + optionLabel;
    
    // Quantity line
    const qtyPriceStr = `${item.quantity} x ${item.unitPrice.toFixed(0)} GEL`;
    const itemTotalStr = `${(item.quantity * item.unitPrice).toFixed(0)} GEL`;
    
    // Try to fit name and total, if name is long, print on separate line above
    if (nameStr.length + itemTotalStr.length < columns) {
      lines.push(padRow(nameStr, itemTotalStr, columns));
    } else {
      lines.push(nameStr);
    }
    lines.push(padRow(`  ${qtyPriceStr}`, itemTotalStr, columns));
  });

  lines.push(dashedHr);

  // Totals
  lines.push(padRow(prepareText('ჯამი (Subtotal):', 'Subtotal:'), `${order.subtotal.toFixed(0)} GEL`, columns));
  
  if (order.discountAmount > 0) {
    lines.push(padRow(prepareText(`ფასდაკლება (${order.discountPercent}%):`, `Discount (${order.discountPercent}%):`), `-${order.discountAmount.toFixed(0)} GEL`, columns));
  }
  
  if (order.serviceChargeAmount > 0) {
    lines.push(padRow(prepareText(`მომსახურება (${order.serviceChargePercent}%):`, `Service Charge (${order.serviceChargePercent}%):`), `+${order.serviceChargeAmount.toFixed(0)} GEL`, columns));
  }

  lines.push(hr);
  lines.push(padRow(prepareText('სულ გადასახდელი:', 'TOTAL AMOUNT:'), `${order.total.toFixed(0)} GEL`, columns));
  lines.push(padRow(prepareText('გადახდა:', 'Payment:'), prepareText(order.paymentMethod === 'cash' ? 'ნაღდი' : 'ბარათი', order.paymentMethod.toUpperCase()), columns));
  lines.push(hr);

  // Thank you message
  lines.push(centerText(prepareText('გმადლობთ სტუმრობისთვის!', 'Thank you! Come again!'), columns));
  lines.push('\n\n\n'); // Spacing to allow manual tear

  return lines.join('\n');
}

function centerText(text: string, columns: number): string {
  if (text.length >= columns) return text.substring(0, columns);
  const diff = columns - text.length;
  const leftPad = Math.floor(diff / 2);
  return ' '.repeat(leftPad) + text;
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return `${d.toLocaleDateString()} ${d.toTimeString().substring(0, 5)}`;
  } catch {
    return '';
  }
}

/**
 * Generate binary ESC/POS payload for high performance USB Printer printing
 */
export function generateEscPosPayload(order: Order, printWidth: '58mm' | '80mm', encoding: 'utf8' | 'translit' | 'english'): Uint8Array {
  const textContent = generateTextReceipt(order, printWidth, encoding);
  
  // Standard ESC/POS basic init
  const ESC = 0x1B;
  const GS = 0x1D;
  
  const init = [ESC, 0x40]; // Initialize printer
  const centerAlign = [ESC, 0x61, 0x01]; // Center align
  const leftAlign = [ESC, 0x61, 0x00]; // Left align
  const cutPaper = [GS, 0x56, 0x41, 0x03]; // Cut paper
  
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(textContent);
  
  // Build a neat sequence
  const buffer: number[] = [];
  buffer.push(...init);
  buffer.push(...textBytes);
  buffer.push(0x0A, 0x0A, 0x0A); // Extra lines before cut
  buffer.push(...cutPaper);
  
  return new Uint8Array(buffer);
}

/**
 * Scans a connected USB Device to determine the BULK OUT printer endpoint.
 */
export function findBulkOutEndpoint(device: any): number {
  if (!device.configurations || device.configurations.length === 0) {
    return 1; // standard default
  }
  
  for (const selection of device.configurations) {
    for (const iface of selection.interfaces) {
      for (const alternate of iface.alternates) {
        // Option A: Interface subclass 1, protocol 2 is commonly PRINTER ESC/POS
        for (const endpoint of alternate.endpoints) {
          if (endpoint.direction === 'out' && endpoint.type === 'bulk') {
            return endpoint.endpointNumber;
          }
        }
      }
    }
  }
  return 1; // Fallback
}
