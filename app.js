'use strict';

const STORE = 'control_rifa_vanilla_v1';
const $ = id => document.getElementById(id);
const blank = () => ({
  version: 1,
  price: 2000,
  numbers: Array.from({ length: 100 }, (_, i) => ({
    number: String(i).padStart(2, '0'),
    buyer: '',
    paid: 0,
    movements: []
  }))
});
const money = n => '₡' + Math.round(n).toLocaleString('es-CR');
const parseMoney = s => {
  const cleaned = s.replace(/[₡\s]/g, '').replace(/\./g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
};
const key = s => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');

let data = load();
let tab = 'numeros';
let selected = new Set();
let filter = 'todos';
let search = '';
let target = '';
let expanded = new Set();

function valid(v) {
  return !!(
    v &&
    v.version === 1 &&
    Number.isSafeInteger(v.price) &&
    v.price > 0 &&
    Array.isArray(v.numbers) &&
    v.numbers.length === 100 &&
    v.numbers.every((x, i) =>
      x &&
      x.number === String(i).padStart(2, '0') &&
      typeof x.buyer === 'string' &&
      x.buyer.length <= 100 &&
      Number.isSafeInteger(x.paid) &&
      x.paid >= 0 &&
      x.paid <= v.price &&
      Array.isArray(x.movements) &&
      x.movements.every(m =>
        m &&
        typeof m.id === 'string' &&
        typeof m.date === 'string' &&
        !isNaN(Date.parse(m.date)) &&
        Number.isSafeInteger(m.amount) &&
        m.amount > 0
      ) &&
      x.movements.reduce((a, m) => a + m.amount, 0) === x.paid &&
      (!x.paid || x.buyer.trim())
    )
  );
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE));
    if (valid(d)) return d;
  } catch {}
  return blank();
}

function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify(data));
    return true;
  } catch {
    notice('No se pudo guardar en este navegador.', true);
    return false;
  }
}

function status(x) {
  return !x.buyer ? 'libre' : x.paid >= data.price ? 'pagado' : 'pendiente';
}

function notice(s, error = false) {
  $('notice').textContent = s;
  $('notice').classList.toggle('error', error);
  $('notice').hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function update() {
  save();
  render();
}

function groups() {
  const map = new Map();
  for (const x of data.numbers) {
    if (!x.buyer) continue;
    const k = key(x.buyer);
    if (!map.has(k))
      map.set(k, {
        id: k,
        name: x.buyer.trim(),
        items: [],
        paid: 0
      });
    const g = map.get(k);
    g.items.push(x);
    g.paid += x.paid;
  }
  return [...map.values()]
    .map(g => ({
      ...g,
      total: g.items.length * data.price,
      due: g.items.length * data.price - g.paid
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

function movementsFor(g) {
  return g.items
    .flatMap(x => x.movements.map(m => ({ ...m, number: x.number })))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function el(tag, content, className) {
  const n = document.createElement(tag);
  if (content !== undefined) n.textContent = content;
  if (className) n.className = className;
  return n;
}

function render() {
  const taken = data.numbers.filter(x => x.buyer);
  const free = data.numbers.filter(x => !x.buyer);
  const people = groups();

  $('priceInput').value = money(data.price);
  $('availableCount').textContent = free.length;
  $('assignedCount').textContent = taken.length;
  $('collectedCount').textContent = money(
    taken.reduce((a, x) => a + x.paid, 0)
  );
  $('dueCount').textContent = money(
    taken.reduce((a, x) => a + data.price - x.paid, 0)
  );

  $('numbersView').hidden = tab !== 'numeros';
  $('paymentsView').hidden = tab !== 'pagos';
  $('numbersTab').classList.toggle('active', tab === 'numeros');
  $('paymentsTab').classList.toggle('active', tab === 'pagos');

  const grid = $('grid');
  grid.replaceChildren();
  let count = 0;
  for (const x of data.numbers) {
    if (filter !== 'todos' && status(x) !== filter) continue;
    if (
      !(x.number + ' ' + x.buyer)
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase())
    )
      continue;
    count++;
    const b = el(
      'button',
      undefined,
      'num ' + status(x) + (selected.has(x.number) ? ' chosen' : '')
    );
    b.type = 'button';
    b.title = x.buyer || 'Disponible';
    b.append(el('strong', x.number), el('small', x.buyer || 'Libre'));
    b.onclick = () => {
      if (x.buyer) {
        target = key(x.buyer);
        tab = 'pagos';
        render();
        return;
      }
      selected.has(x.number)
        ? selected.delete(x.number)
        : selected.add(x.number);
      render();
    };
    grid.append(b);
  }
  $('noNumbers').hidden = count !== 0;
  $('selectionText').textContent =
    'Seleccionados: ' +
    (selected.size ? [...selected].sort().join(', ') : 'Ninguno');
  $('assignBtn').disabled = !selected.size;

  const select = $('paymentBuyer');
  select.replaceChildren(new Option('Seleccionar comprador', ''));
  for (const g of people.filter(g => g.due > 0))
    select.add(new Option(g.name + ' — saldo ' + money(g.due), g.id));
  if (!people.some(g => g.id === target && g.due > 0)) target = '';
  select.value = target;
  const current = people.find(g => g.id === target);
  $('paymentDetail').textContent = current
    ? 'Números: ' +
      current.items.map(x => x.number).join(', ') +
      ' · Saldo pendiente: ' +
      money(current.due)
    : '';
  $('fillPayment').disabled = !current;

  const body = $('buyersBody');
  body.replaceChildren();
  for (const g of people) {
    const tr = el('tr');
    for (const v of [
      g.name,
      g.items.map(x => x.number).join(', '),
      money(g.total),
      money(g.paid),
      money(g.due)
    ])
      tr.append(el('td', v));
    const st = el('td');
    st.append(
      el(
        'span',
        g.due === 0 ? 'Pagado' : 'Pendiente',
        'pill ' + (g.due === 0 ? 'pagado' : 'pendiente')
      )
    );
    tr.append(st);
    const actions = el('td');
    const historyBtn = el(
      'button',
      expanded.has(g.id) ? 'Ocultar movimientos' : 'Ver movimientos',
      'textbutton'
    );
    historyBtn.type = 'button';
    historyBtn.onclick = () => {
      expanded.has(g.id)
        ? expanded.delete(g.id)
        : expanded.add(g.id);
      render();
    };
    actions.append(historyBtn);
    if (g.due > 0) {
      const abonoBtn = el('button', 'Abonar', 'textbutton');
      abonoBtn.type = 'button';
      abonoBtn.onclick = () => {
        target = g.id;
        render();
        $('paymentAmount').focus();
      };
      actions.append(abonoBtn);
    }
    tr.append(actions);
    body.append(tr);

    if (expanded.has(g.id)) {
      const detailRow = el('tr');
      const td = el('td', undefined, 'buyer-detail');
      td.colSpan = 7;
      const numberActions = el('div', undefined, 'number-actions');
      for (const x of g.items) {
        const wrap = el('span', undefined, 'number-action');
        wrap.append(el('strong', x.number + ' '));
        if (x.paid === 0) {
          const releaseBtn = el('button', 'Liberar', 'textbutton');
          releaseBtn.type = 'button';
          releaseBtn.onclick = () => release(x.number);
          wrap.append(releaseBtn);
        } else {
          wrap.append(el('small', money(x.paid) + ' abonados'));
        }
        numberActions.append(wrap);
      }
      td.append(numberActions);
      const hist = movementsFor(g);
      if (hist.length) {
        td.append(el('h3', 'Movimientos de ' + g.name));
        const table = el('table', undefined, 'mini-table'),
          head = el('thead'),
          heading = el('tr');
        for (const label of ['Fecha', 'Número', 'Abono'])
          heading.append(el('th', label));
        head.append(heading);
        table.append(head);
        const tb = el('tbody');
        for (const m of hist) {
          const r = el('tr');
          for (const val of [
            new Date(m.date).toLocaleString('es-CR'),
            m.number,
            money(m.amount)
          ])
            r.append(el('td', val));
          tb.append(r);
        }
        table.append(tb);
        td.append(table);
      } else
        td.append(
          el(
            'p',
            'Esta persona todavía no tiene abonos registrados.',
            'hint'
          )
        );
      detailRow.append(td);
      body.append(detailRow);
    }
  }
  $('noBuyers').hidden = people.length !== 0;
}

function release(num) {
  const x = data.numbers.find(x => x.number === num);
  if (!x || x.paid > 0)
    return notice('No es posible liberar un número que tiene abonos.', true);
  if (!confirm('¿Liberar el número ' + num + '?')) return;
  x.buyer = '';
  selected.delete(num);
  update();
  notice('Número ' + num + ' liberado.');
}

$('assignForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('buyerInput').value.trim().replace(/\s+/g, ' ');
  if (!name || !selected.size)
    return notice(
      'Escribí un comprador y seleccioná al menos un número.',
      true
    );
  const existing = groups().find(g => g.id === key(name));
  const canonical = existing?.name || name;
  let count = 0;
  for (const x of data.numbers) {
    if (selected.has(x.number) && !x.buyer) {
      x.buyer = canonical;
      count++;
    }
  }
  selected.clear();
  $('buyerInput').value = '';
  update();
  notice('Se asignaron ' + count + ' números a ' + canonical + '.');
});

$('clearSelection').onclick = () => {
  selected.clear();
  render();
};

$('numbersTab').onclick = () => {
  tab = 'numeros';
  render();
};

$('paymentsTab').onclick = () => {
  tab = 'pagos';
  render();
};

$('search').oninput = e => {
  search = e.target.value.trim();
  render();
};

$('filter').onchange = e => {
  filter = e.target.value;
  render();
};

$('paymentBuyer').onchange = e => {
  target = e.target.value;
  render();
};

$('fillPayment').onclick = () => {
  const g = groups().find(g => g.id === target);
  if (g) $('paymentAmount').value = String(g.due);
};

$('priceInput').addEventListener('change', e => {
  const newPrice = parseMoney(e.target.value);
  if (!Number.isSafeInteger(newPrice) || newPrice <= 0) {
    e.target.value = money(data.price);
    return notice('El precio debe ser un número entero positivo.', true);
  }
  if (
    !confirm(
      '¿Cambiar el precio a ' + money(newPrice) + '? Esto afectará los cálculos de saldo pendiente.'
    )
  ) {
    e.target.value = money(data.price);
    return;
  }
  data.price = newPrice;
  update();
  notice('Precio actualizado a ' + money(newPrice) + '.');
});

$('priceInput').addEventListener('focus', e => {
  e.target.select();
});

$('paymentForm').addEventListener('submit', e => {
  e.preventDefault();
  const g = groups().find(g => g.id === target),
    amount = Number($('paymentAmount').value);
  if (
    !g ||
    g.due === 0 ||
    !Number.isSafeInteger(amount) ||
    amount < 1
  )
    return notice(
      'Elegí un comprador pendiente y un abono entero mayor a cero.',
      true
    );
  if (amount > g.due)
    return notice('El abono supera el saldo pendiente.', true);
  let remaining = amount;
  for (const x of g.items) {
    const open = data.price - x.paid;
    const applied = Math.min(open, remaining);
    if (applied > 0) {
      x.paid += applied;
      x.movements.push({
        id:
          globalThis.crypto?.randomUUID?.() ||
          String(Date.now()) + '-' + Math.random(),
        date: new Date().toISOString(),
        amount: applied
      });
      remaining -= applied;
    }
    if (!remaining) break;
  }
  $('paymentAmount').value = '';
  update();
  notice('Abono de ' + money(amount) + ' registrado a ' + g.name + '.');
});

$('copyBtn').onclick = async () => {
  const txt = data.numbers
    .filter(x => !x.buyer)
    .map(x => x.number)
    .join(', ');
  if (!txt) return notice('No quedan números disponibles.', true);
  try {
    await navigator.clipboard.writeText(txt);
    notice('Números copiados para WhatsApp.');
  } catch {
    const ta = el('textarea');
    ta.value = txt;
    document.body.append(ta);
    ta.select();
    if (document.execCommand('copy')) notice('Números copiados.');
    else prompt('Copiá los números:', txt);
    ta.remove();
  }
};

$('resetBtn').onclick = () => {
  if (
    !confirm(
      '¿Eliminar TODOS los compradores, pagos y movimientos? No se puede deshacer.'
    )
  )
    return;
  if (!confirm('Confirmación final: ¿restablecer los 100 números?')) return;

  // Borrar todas las claves relacionadas del localStorage
  const keysToDelete = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('rifa')) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => localStorage.removeItem(key));

  // Restablecer datos
  data = blank();
  selected.clear();
  expanded.clear();
  target = '';
  search = '';
  filter = 'todos';
  $('search').value = '';
  $('filter').value = 'todos';
  $('buyerInput').value = '';
  $('paymentAmount').value = '';
  tab = 'numeros';
  update();
  notice('Rifa restablecida: 100 números libres.');
};

render();
