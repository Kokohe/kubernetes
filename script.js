const state = {
  resources: [],
  counter: { pod: 0, deploy: 0, svc: 0, ns: 0, cfg: 0, rs: 0, ingress: 0, secret: 0, pvc: 0 },
  filter: 'all'
};

const names = {
  pod: ['nginx', 'redis', 'postgres', 'api-server', 'worker', 'frontend', 'backend', 'cache', 'monitor'],
  deploy: ['web-app', 'api-gateway', 'auth-service', 'payment-svc', 'user-service', 'data-proc'],
  svc: ['frontend-svc', 'backend-svc', 'db-svc', 'cache-svc', 'api-svc', 'auth-svc'],
  ns: ['production', 'staging', 'monitoring', 'logging', 'security'],
  cfg: ['app-config', 'db-config', 'env-config', 'feature-flags'],
  ingress: ['web-ingress', 'api-ingress', 'admin-ingress'],
  secret: ['db-credentials', 'api-keys', 'tls-cert', 'registry-creds'],
  pvc: ['data-volume', 'logs-pvc', 'uploads-pvc', 'backup-pvc']
};

function randomName(type) {
  const arr = names[type] || names.pod;
  const n = arr[state.counter[type] % arr.length];
  const suffix = state.counter[type] > arr.length - 1 ? `-${Math.floor(state.counter[type] / arr.length) + 1}` : '';
  return n + suffix;
}

function randomId() {
  return Math.random().toString(36).slice(2, 7);
}

function addTermLine(html, cls = 'term-out') {
  const tb = document.getElementById('termBody');
  const cursor = tb.querySelector('.term-cursor');
  const cursorLine = cursor ? cursor.parentElement : null;
  if (cursorLine) cursorLine.remove();

  const d = document.createElement('div');
  d.className = 'term-line';
  d.innerHTML = `<span class="${cls}">${html}</span>`;
  tb.appendChild(d);

  const newCursor = document.createElement('div');
  newCursor.className = 'term-line';
  newCursor.innerHTML = `<span class="term-prompt">➜</span> <span class="term-cursor"></span>`;
  tb.appendChild(newCursor);
  tb.scrollTop = tb.scrollHeight;
}

function addTermPrompt(cmd) {
  const tb = document.getElementById('termBody');
  const cursor = tb.querySelector('.term-cursor');
  const cursorLine = cursor ? cursor.parentElement : null;

  const spacer = document.createElement('div');
  spacer.className = 'term-spacer';
  if (cursorLine) {
    tb.insertBefore(spacer, cursorLine);
    cursorLine.innerHTML = `<span class="term-prompt">➜</span> <span class="term-cmd">${cmd}</span>`;
  } else {
    tb.appendChild(spacer);
    const d = document.createElement('div');
    d.className = 'term-line';
    d.innerHTML = `<span class="term-prompt">➜</span> <span class="term-cmd">${cmd}</span>`;
    tb.appendChild(d);
  }
  tb.scrollTop = tb.scrollHeight;
}

function renderViz() {
  const canvas = document.getElementById('vizCanvas');
  const empty = document.getElementById('emptyState');
  const filtered = state.filter === 'all'
    ? state.resources
    : state.resources.filter(r => r.group === state.filter);

  if (filtered.length === 0) {
    empty.style.display = 'flex';
    Array.from(canvas.querySelectorAll('.node-group')).forEach(el => el.remove());
    return;
  }

  empty.style.display = 'none';

  const groups = {};
  filtered.forEach(r => {
    if (!groups[r.group]) groups[r.group] = [];
    groups[r.group].push(r);
  });

  const groupLabels = {
    pod: 'Pods',
    deploy: 'Deployments',
    rs: 'ReplicaSets',
    svc: 'Services',
    ingress: 'Ingress',
    ns: 'Namespaces',
    cfg: 'ConfigMaps & Secrets',
    pvc: 'Persistent Volume Claims'
  };

  Array.from(canvas.querySelectorAll('.node-group')).forEach(el => el.remove());

  Object.entries(groups).forEach(([grp, items]) => {
    const section = document.createElement('div');
    section.className = 'node-group';
    section.dataset.group = grp;

    const header = document.createElement('div');
    header.className = 'node-group-header';
    header.textContent = groupLabels[grp] || grp;
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'node-grid';

    items.forEach(r => {
      const card = buildCard(r);
      grid.appendChild(card);
    });

    section.appendChild(grid);
    canvas.appendChild(section);
  });
}

function buildCard(r) {
  const card = document.createElement('div');
  card.className = `resource-card card-${r.group === 'svc' || r.group === 'ingress' ? 'svc' : r.group === 'cfg' || r.group === 'pvc' ? 'cfg' : r.group === 'ns' ? 'ns' : r.group === 'deploy' || r.group === 'rs' ? 'deploy' : 'pod'}`;
  card.id = `card-${r.id}`;

  const statusClass = r.status === 'Running' ? 'status-running' : r.status === 'Pending' ? 'status-pending' : 'status-error';
  const pipClass = r.status === 'Running' ? 'pip-running' : r.status === 'Pending' ? 'pip-pending' : 'pip-error';

  const kindColors = {
    pod: 'pod-kind', deploy: 'deploy-kind', rs: 'deploy-kind',
    svc: 'svc-kind', ingress: 'svc-kind', ns: 'ns-kind',
    cfg: 'cfg-kind', secret: 'cfg-kind', pvc: 'cfg-kind'
  };

  const kindLabels = {
    pod: 'Pod', deploy: 'Deployment', rs: 'ReplicaSet',
    'svc-clusterip': 'ClusterIP', 'svc-nodeport': 'NodePort', 'svc-lb': 'LoadBalancer',
    ingress: 'Ingress', ns: 'Namespace', cfg: 'ConfigMap',
    secret: 'Secret', pvc: 'PersistentVolumeClaim'
  };

  const meta = r.meta.map(m => `<span class="meta-pill">${m}</span>`).join('');

  card.innerHTML = `
    <div class="card-header">
      <span class="card-kind ${kindColors[r.group] || 'pod-kind'}">${kindLabels[r.type] || r.type}</span>
      <span class="card-status ${statusClass}">
        <span class="status-pip ${pipClass}"></span>${r.status}
      </span>
    </div>
    <div class="card-name">${r.name}</div>
    <div class="card-meta">${meta}</div>
  `;

  return card;
}

function runCommand(type) {
  const id = randomId();

  const actions = {
    pod: () => {
      state.counter.pod++;
      const name = randomName('pod') + '-' + randomId();
      const img = ['nginx:latest', 'redis:7', 'node:20-alpine', 'python:3.12', 'golang:1.22'][state.counter.pod % 5];
      addTermPrompt(`kubectl run ${name.split('-').slice(0, -1).join('-')} --image=${img}`);
      setTimeout(() => addTermLine(`pod/${name} created`, 'term-out-green'), 300);
      const r = { id, type: 'pod', group: 'pod', name, status: 'Pending', meta: [img, 'ns:default'] };
      state.resources.push(r);
      renderViz();
      setTimeout(() => { r.status = 'Running'; renderViz(); }, 1400);
    },
    deploy: () => {
      state.counter.deploy++;
      const name = randomName('deploy');
      const replicas = [2, 3, 1, 3][state.counter.deploy % 4];
      const img = ['nginx:latest', 'node:20-alpine', 'python:3.12', 'golang:1.22'][state.counter.deploy % 4];
      addTermPrompt(`kubectl create deployment ${name} --image=${img} --replicas=${replicas}`);
      setTimeout(() => addTermLine(`deployment.apps/${name} created`, 'term-out-green'), 300);
      state.resources.push({ id, type: 'deploy', group: 'deploy', name, status: 'Running', meta: [`replicas:${replicas}`, img, 'ns:default'] });
      renderViz();
    },
    replicaset: () => {
      state.counter.rs = (state.counter.rs || 0) + 1;
      const name = `rs-${randomName('deploy')}-${randomId()}`;
      addTermPrompt(`kubectl create replicaset ${name} --replicas=3 --image=nginx`);
      setTimeout(() => addTermLine(`replicaset.apps/${name} created`, 'term-out-green'), 300);
      state.resources.push({ id, type: 'rs', group: 'rs', name, status: 'Running', meta: ['replicas:3', 'nginx:latest'] });
      renderViz();
    },
    'svc-clusterip': () => {
      state.counter.svc++;
      const name = randomName('svc');
      const port = [80, 8080, 3000, 5432, 6379][state.counter.svc % 5];
      addTermPrompt(`kubectl expose deployment ${name} --type=ClusterIP --port=${port}`);
      setTimeout(() => addTermLine(`service/${name} exposed`, 'term-out-green'), 300);
      state.resources.push({ id, type: 'svc-clusterip', group: 'svc', name, status: 'Running', meta: [`port:${port}`, 'ClusterIP', '10.96.x.x'] });
      renderViz();
    },
    'svc-nodeport': () => {
      state.counter.svc++;
      const name = randomName('svc');
      const port = 30000 + Math.floor(Math.random() * 2767);
      addTermPrompt(`kubectl expose deployment ${name} --type=NodePort --port=80 --node-port=${port}`);
      setTimeout(() => addTermLine(`service/${name} exposed`, 'term-out-green'), 300);
      state.resources.push({ id, type: 'svc-nodeport', group: 'svc', name, status: 'Running', meta: ['80:' + port, 'NodePort'] });
      renderViz();
    },
    'svc-lb': () => {
      state.counter.svc++;
      const name = randomName('svc');
      addTermPrompt(`kubectl expose deployment ${name} --type=LoadBalancer --port=443`);
      setTimeout(() => addTermLine(`service/${name} exposed`, 'term-out-green'), 300);
      const r = { id, type: 'svc-lb', group: 'svc', name, status: 'Pending', meta: ['port:443', 'LoadBalancer', 'pending...'] };
      state.resources.push(r);
      renderViz();
      setTimeout(() => {
        r.status = 'Running';
        r.meta[2] = '203.0.113.' + Math.floor(Math.random() * 200 + 10);
        renderViz();
      }, 2000);
    },
    ingress: () => {
      state.counter.ingress = (state.counter.ingress || 0) + 1;
      const name = randomName('ingress');
      const host = ['app.example.com', 'api.example.com', 'admin.lab.io'][state.counter.ingress % 3];
      addTermPrompt(`kubectl create ingress ${name} --rule="${host}/=frontend-svc:80"`);
      setTimeout(() => addTermLine(`ingress.networking.k8s.io/${name} created`, 'term-out-green'), 300);
      state.resources.push({ id, type: 'ingress', group: 'ingress', name, status: 'Running', meta: [host, 'port:80'] });
      renderViz();
    },
    configmap: () => {
      state.counter.cfg++;
      const name = randomName('cfg');
      addTermPrompt(`kubectl create configmap ${name} --from-literal=ENV=production --from-literal=LOG_LEVEL=info`);
      setTimeout(() => addTermLine(`configmap/${name} created`, 'term-out-green'), 300);
      state.resources.push({ id, type: 'cfg', group: 'cfg', name, status: 'Running', meta: ['2 keys', 'ns:default'] });
      renderViz();
    },
    secret: () => {
      state.counter.secret = (state.counter.secret || 0) + 1;
      const name = randomName('secret');
      addTermPrompt(`kubectl create secret generic ${name} --from-literal=password=s3cr3t`);
      setTimeout(() => addTermLine(`secret/${name} created`, 'term-out-green'), 300);
      state.resources.push({ id, type: 'secret', group: 'cfg', name, status: 'Running', meta: ['Opaque', '1 key'] });
      renderViz();
    },
    namespace: () => {
      state.counter.ns++;
      const name = randomName('ns');
      addTermPrompt(`kubectl create namespace ${name}`);
      setTimeout(() => addTermLine(`namespace/${name} created`, 'term-out-green'), 300);
      state.resources.push({ id, type: 'ns', group: 'ns', name, status: 'Running', meta: ['Active'] });
      renderViz();
    },
    pvc: () => {
      state.counter.pvc = (state.counter.pvc || 0) + 1;
      const name = randomName('pvc');
      const size = ['1Gi', '5Gi', '10Gi', '20Gi'][state.counter.pvc % 4];
      addTermPrompt(`kubectl create pvc ${name} --storage=${size} --access-mode=ReadWriteOnce`);
      setTimeout(() => addTermLine(`persistentvolumeclaim/${name} created`, 'term-out-green'), 300);
      const r = { id, type: 'pvc', group: 'pvc', name, status: 'Pending', meta: [size, 'RWO', 'Pending'] };
      state.resources.push(r);
      renderViz();
      setTimeout(() => { r.status = 'Running'; r.meta[2] = 'Bound'; renderViz(); }, 1800);
    },
    'get-all': () => {
      addTermPrompt('kubectl get all -n default');
      if (state.resources.length === 0) {
        setTimeout(() => addTermLine('No resources found in default namespace.', 'term-out-yellow'), 300);
        return;
      }
      setTimeout(() => {
        addTermLine('NAME&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;READY&nbsp;&nbsp;STATUS&nbsp;&nbsp;&nbsp;RESTARTS&nbsp;&nbsp;AGE', 'term-out-muted');
        state.resources.slice(-6).forEach(r => {
          const age = Math.floor(Math.random() * 55 + 1) + 's';
          const ready = r.status === 'Running' ? '1/1' : '0/1';
          addTermLine(`${(r.type + '/' + r.name).padEnd(40)} ${ready.padEnd(7)} ${r.status.padEnd(9)} 0&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${age}`, 'term-out');
        });
      }, 300);
    },
    describe: () => {
      if (state.resources.length === 0) {
        addTermPrompt('kubectl describe pod');
        setTimeout(() => addTermLine('Error: no resources specified', 'term-error'), 300);
        return;
      }
      const r = state.resources[state.resources.length - 1];
      addTermPrompt(`kubectl describe ${r.type} ${r.name}`);
      setTimeout(() => {
        addTermLine(`Name:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${r.name}`, 'term-out');
        addTermLine(`Namespace:&nbsp;&nbsp;&nbsp;&nbsp;default`, 'term-out');
        addTermLine(`Status:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="${r.status === 'Running' ? 'term-out-green' : 'term-out-yellow'}">${r.status}</span>`, 'term-out');
        addTermLine(`Labels:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;app=${r.name.split('-')[0]}`, 'term-out');
        addTermLine(`Events:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="term-out-blue">Normal</span>  Scheduled  Successfully assigned`, 'term-out');
      }, 300);
    },
    'delete-last': () => {
      if (state.resources.length === 0) {
        addTermPrompt('kubectl delete');
        setTimeout(() => addTermLine('Error: no resources to delete', 'term-error'), 300);
        return;
      }
      const r = state.resources.pop();
      addTermPrompt(`kubectl delete ${r.type} ${r.name}`);
      setTimeout(() => addTermLine(`${r.type}.apps "${r.name}" deleted`, 'term-out-yellow'), 300);
      renderViz();
    },
    'delete-all': () => {
      addTermPrompt('kubectl delete all --all -n default');
      setTimeout(() => {
        const count = state.resources.length;
        state.resources = [];
        addTermLine(`${count} resource(s) deleted`, 'term-out-yellow');
        renderViz();
      }, 400);
    }
  };

  if (actions[type]) actions[type]();
}

function setFilter(f, btn) {
  state.filter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderViz();
}
