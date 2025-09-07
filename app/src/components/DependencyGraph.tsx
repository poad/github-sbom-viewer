import { createEffect, createSignal, onMount, onCleanup } from 'solid-js';

interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isMain?: boolean;
}

interface Link {
  source: string;
  target: string;
}

interface DependencyGraphProps {
  packages: { name?: string; versionInfo?: string }[];
  mainPackageName: string;
  width?: number;
  height?: number;
}

export default function DependencyGraph(props: DependencyGraphProps) {
  let canvasRef: HTMLCanvasElement | undefined;
  const [hoveredNode, setHoveredNode] = createSignal<string | null>(null);
  const [nodes, setNodes] = createSignal<Node[]>([]);
  const [links, setLinks] = createSignal<Link[]>([]);

  const width = () => props.width || 800;
  const height = () => props.height || 600;

  // Initialize graph data
  createEffect(() => {
    const packages = props.packages.filter(pkg => pkg.name);
    const mainName = props.mainPackageName;
    
    const nodeMap = new Map<string, Node>();
    
    // Create main package node
    const mainNode: Node = {
      id: mainName,
      name: mainName,
      x: width() / 2,
      y: height() / 2,
      vx: 0,
      vy: 0,
      radius: 25,
      isMain: true,
    };
    nodeMap.set(mainName, mainNode);

    // Create dependency nodes
    packages.forEach((pkg, index) => {
      if (pkg.name && pkg.name !== mainName) {
        const angle = (index / packages.length) * 2 * Math.PI;
        const distance = 150;
        const node: Node = {
          id: pkg.name,
          name: pkg.name,
          x: width() / 2 + Math.cos(angle) * distance,
          y: height() / 2 + Math.sin(angle) * distance,
          vx: 0,
          vy: 0,
          radius: 15,
          isMain: false,
        };
        nodeMap.set(pkg.name, node);
      }
    });

    // Create links from main package to dependencies
    const linkList: Link[] = [];
    packages.forEach(pkg => {
      if (pkg.name && pkg.name !== mainName) {
        linkList.push({ source: mainName, target: pkg.name });
      }
    });

    setNodes(Array.from(nodeMap.values()));
    setLinks(linkList);
  });

  // Physics simulation
  const simulate = () => {
    const nodeArray = nodes();
    const linkArray = links();
    
    // Apply forces
    nodeArray.forEach(node => {
      // Center force for main package
      if (node.isMain) {
        const centerX = width() / 2;
        const centerY = height() / 2;
        node.vx += (centerX - node.x) * 0.001;
        node.vy += (centerY - node.y) * 0.001;
      }

      // Repulsion between nodes
      nodeArray.forEach(other => {
        if (node !== other) {
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 500 / (distance * distance);
          node.vx += (dx / distance) * force;
          node.vy += (dy / distance) * force;
        }
      });

      // Apply velocity damping
      node.vx *= 0.9;
      node.vy *= 0.9;

      // Update positions
      node.x += node.vx;
      node.y += node.vy;

      // Boundary constraints
      node.x = Math.max(node.radius, Math.min(width() - node.radius, node.x));
      node.y = Math.max(node.radius, Math.min(height() - node.radius, node.y));
    });

    // Link forces
    linkArray.forEach(link => {
      const source = nodeArray.find(n => n.id === link.source);
      const target = nodeArray.find(n => n.id === link.target);
      if (source && target) {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDistance = 100;
        const force = (distance - targetDistance) * 0.01;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      }
    });

    setNodes([...nodeArray]);
  };

  // Canvas drawing
  const draw = () => {
    const canvas = canvasRef;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width(), height());

    // Draw links
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    links().forEach(link => {
      const source = nodes().find(n => n.id === link.source);
      const target = nodes().find(n => n.id === link.target);
      if (source && target) {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      }
    });

    // Draw nodes
    nodes().forEach(node => {
      ctx.fillStyle = node.isMain ? '#2563eb' : '#64748b';
      if (hoveredNode() === node.id) {
        ctx.fillStyle = node.isMain ? '#1d4ed8' : '#475569';
      }
      
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fill();

      // Draw node labels
      ctx.fillStyle = '#fff';
      ctx.font = node.isMain ? '14px bold sans-serif' : '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const displayName = node.name.length > 15 ? node.name.substring(0, 12) + '...' : node.name;
      ctx.fillText(displayName, node.x, node.y);
    });
  };

  // Mouse interaction
  const handleMouseMove = (e: MouseEvent) => {
    const canvas = canvasRef;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let foundNode: string | null = null;
    nodes().forEach(node => {
      const distance = Math.sqrt((mouseX - node.x) ** 2 + (mouseY - node.y) ** 2);
      if (distance <= node.radius) {
        foundNode = node.id;
      }
    });

    setHoveredNode(foundNode);
  };

  // Animation loop with throttling to reduce CPU load
  const FRAME_INTERVAL = 1000 / 30; // target ~30 FPS
  let lastTimestamp = 0;
  const animate = (timestamp: number) => {
    const delta = timestamp - lastTimestamp;
    if (delta >= FRAME_INTERVAL) {
      simulate();
      draw();
      lastTimestamp = timestamp;
    }
    requestAnimationFrame(animate);
  };

  let animationFrameId: number;

  onMount(() => {
    if (canvasRef) {
      canvasRef.addEventListener('mousemove', handleMouseMove);
      animationFrameId = requestAnimationFrame(animate);
    }
  });

  onCleanup(() => {
    if (canvasRef) {
      canvasRef.removeEventListener('mousemove', handleMouseMove);
    }
    cancelAnimationFrame(animationFrameId);
  });

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={width()}
        height={height()}
        style={{ border: '1px solid #ccc', background: '#f8fafc' }}
      />
      {hoveredNode() && (
        <div style={{
          position: 'absolute',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 12px',
          'border-radius': '4px',
          'font-size': '14px',
          'pointer-events': 'none',
          'z-index': 1000,
        }}>
          {hoveredNode()}
        </div>
      )}
    </div>
  );
}