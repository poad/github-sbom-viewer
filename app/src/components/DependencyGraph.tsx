import { createEffect, createMemo, createSignal, onCleanup } from 'solid-js';

interface Package {
  SPDXID?: string;
  name?: string;
  versionInfo?: string;
  downloadLocation?: string;
  filesAnalyzed?: boolean;
  licenseConcluded?: string;
  licenseDeclared?: string;
  supplier?: string;
  externalRefs?: {
    referenceCategory: string;
    referenceLocator: string;
    referenceType: string;
  }[];
}

interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
  versionInfo?: string;
  category: string;
}

interface Link {
  source: string;
  target: string;
  type: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface DependencyGraphProps {
  packages: Package[];
  width?: number;
  height?: number;
}

export function DependencyGraph(props: DependencyGraphProps) {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();
  const [ctx, setCtx] = createSignal<CanvasRenderingContext2D>();
  const [graphData, setGraphData] = createSignal<GraphData>({ nodes: [], links: [] });
  const [hoveredNode, setHoveredNode] = createSignal<Node | null>(null);

  const width = createMemo(() => props.width ?? 800);
  const height = createMemo(() => props.height ?? 600);

  // パッケージデータからグラフデータを生成
  const generateGraphData = (packages: Package[]): GraphData => {
    const nodes: Node[] = [];
    const links: Link[] = [];
    const nodeMap = new Map<string, Node>();

    // メインパッケージのノードを作成
    packages.forEach((pkg, index) => {
      if (pkg.name) {
        const node: Node = {
          id: pkg.SPDXID || `pkg-${index}`,
          name: pkg.name,
          x: Math.random() * (width() - 100) + 50,
          y: Math.random() * (height() - 100) + 50,
          versionInfo: pkg.versionInfo,
          category: 'main',
        };
        nodes.push(node);
        nodeMap.set(node.id, node);
      }
    });

    // 外部参照から依存関係のリンクを作成
    packages.forEach((pkg) => {
      if (pkg.externalRefs && pkg.SPDXID) {
        pkg.externalRefs.forEach((ref) => {
          // 依存関係の場合
          if (ref.referenceCategory === 'PACKAGE_MANAGER' || ref.referenceType.includes('purl')) {
            const targetId = `dep-${ref.referenceLocator}`;

            // 依存関係のノードが存在しない場合は作成
            if (!nodeMap.has(targetId)) {
              const depName = extractPackageName(ref.referenceLocator);
              const depNode: Node = {
                id: targetId,
                name: depName,
                x: Math.random() * (width() - 100) + 50,
                y: Math.random() * (height() - 100) + 50,
                category: 'dependency',
              };
              nodes.push(depNode);
              nodeMap.set(targetId, depNode);
            }

            // リンクを追加
            links.push({
              source: pkg.SPDXID ?? '',
              target: targetId,
              type: ref.referenceType,
            });
          }
        });
      }
    });

    return { nodes, links };
  };

  // パッケージ名を抽出する関数
  const extractPackageName = (locator: string): string => {
    // purl形式からパッケージ名を抽出
    if (locator.startsWith('pkg:')) {
      const parts = locator.split('/');
      if (parts.length > 1) {
        const nameVersion = parts[parts.length - 1];
        return nameVersion.split('@')[0];
      }
    }
    return locator;
  };

  // 力学シミュレーション用の簡単な物理計算
  const applyForces = () => {
    const data = graphData();
    const nodes = [...data.nodes];
    const links = data.links;

    // 斥力（ノード同士を離す）
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 50 / (distance * distance);

        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        nodes[i].x -= fx;
        nodes[i].y -= fy;
        nodes[j].x += fx;
        nodes[j].y += fy;
      }
    }

    // 引力（リンクで結ばれたノードを近づける）
    links.forEach(link => {
      const source = nodes.find(n => n.id === link.source);
      const target = nodes.find(n => n.id === link.target);

      if (source && target) {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (distance - 100) * 0.1;

        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        source.x += fx;
        source.y += fy;
        target.x -= fx;
        target.y -= fy;
      }
    });

    // 境界内に収める
    nodes.forEach(node => {
      node.x = Math.max(30, Math.min(width() - 30, node.x));
      node.y = Math.max(30, Math.min(height() - 30, node.y));
    });

    setGraphData({ nodes, links });
  };

  // 描画関数
  const draw = () => {
    const context = ctx();
    if (!context) return;

    const data = graphData();

    // キャンバスをクリア
    context.clearRect(0, 0, width(), height());

    // リンクを描画
    context.strokeStyle = '#999';
    context.lineWidth = 1;
    data.links.forEach(link => {
      const source = data.nodes.find(n => n.id === link.source);
      const target = data.nodes.find(n => n.id === link.target);

      if (source && target) {
        context.beginPath();
        context.moveTo(source.x, source.y);
        context.lineTo(target.x, target.y);
        context.stroke();

        // 矢印を描画
        const angle = Math.atan2(target.y - source.y, target.x - source.x);
        const arrowLength = 10;
        context.beginPath();
        context.moveTo(target.x, target.y);
        context.lineTo(
          target.x - arrowLength * Math.cos(angle - Math.PI / 6),
          target.y - arrowLength * Math.sin(angle - Math.PI / 6),
        );
        context.moveTo(target.x, target.y);
        context.lineTo(
          target.x - arrowLength * Math.cos(angle + Math.PI / 6),
          target.y - arrowLength * Math.sin(angle + Math.PI / 6),
        );
        context.stroke();
      }
    });

    // ノードを描画
    data.nodes.forEach(node => {
      const isHovered = hoveredNode()?.id === node.id;
      const radius = isHovered ? 25 : 20;

      // ノードの色を種類に応じて変更
      if (node.category === 'main') {
        context.fillStyle = isHovered ? '#4CAF50' : '#2196F3';
      } else {
        context.fillStyle = isHovered ? '#FF9800' : '#FFC107';
      }

      context.beginPath();
      context.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      context.fill();

      context.strokeStyle = '#fff';
      context.lineWidth = 2;
      context.stroke();

      // ノード名を描画
      context.fillStyle = '#000';
      context.font = '12px Arial';
      context.textAlign = 'center';
      const displayName = node.name.length > 15 ? node.name.substring(0, 12) + '...' : node.name;
      context.fillText(displayName, node.x, node.y + radius + 15);

      // バージョン情報があれば表示
      if (node.versionInfo) {
        context.font = '10px Arial';
        context.fillStyle = '#666';
        context.fillText(node.versionInfo, node.x, node.y + radius + 28);
      }
    });

    // ホバー情報を表示
    const hovered = hoveredNode();
    if (hovered) {
      context.fillStyle = 'rgba(0, 0, 0, 0.8)';
      context.fillRect(hovered.x + 30, hovered.y - 20, 200, 60);

      context.fillStyle = '#fff';
      context.font = '14px Arial';
      context.textAlign = 'left';
      context.fillText(`Name: ${hovered.name}`, hovered.x + 35, hovered.y - 5);
      if (hovered.versionInfo) {
        context.fillText(`Version: ${hovered.versionInfo}`, hovered.x + 35, hovered.y + 15);
      }
      context.fillText(`Type: ${hovered.category}`, hovered.x + 35, hovered.y + 30);
    }
  };

  // マウスイベントハンドラー
  const handleMouseMove = (event: MouseEvent) => {
    const canvasElement = canvas();
    if (!canvasElement) return;

    const rect = canvasElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const data = graphData();
    const hoveredNodeFound = data.nodes.find(node => {
      const dx = x - node.x;
      const dy = y - node.y;
      return Math.sqrt(dx * dx + dy * dy) <= 25;
    });

    setHoveredNode(hoveredNodeFound || null);
  };

  // アニメーションループ
  let animationFrame: number | undefined = undefined;
  const animate = () => {
    applyForces();
    draw();
    animationFrame = requestAnimationFrame(animate);
  };

  // エフェクト
  createEffect(() => {
    const canvasElement = canvas();
    if (canvasElement) {
      const context = canvasElement.getContext('2d');
      if (context) {
        setCtx(context);
      }
    }
  });

  createEffect(() => {
    if (props.packages && props.packages.length > 0) {
      const data = generateGraphData(props.packages);
      setGraphData(data);
      animate();
    }
  });

  createEffect(() => {
    const canvasElement = canvas();
    if (canvasElement) {
      canvasElement.addEventListener('mousemove', handleMouseMove);

      onCleanup(() => {
        canvasElement.removeEventListener('mousemove', handleMouseMove);
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
      });
    }
  });

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={setCanvas}
        width={width()}
        height={height()}
        aria-label="依存関係グラフ"
        role='img'
        style={{
          border: '1px solid #ccc',
          'border-radius': '4px',
          cursor: hoveredNode() ? 'pointer' : 'default',
        }}
      />
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '10px',
        'border-radius': '4px',
        'font-size': '12px',
      }}>
        <div style={{ display: 'flex', 'align-items': 'center', 'margin-bottom': '5px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            background: '#2196F3',
            'border-radius': '50%',
            'margin-right': '5px',
          }} />
          メインパッケージ
        </div>
        <div style={{ display: 'flex', 'align-items': 'center' }}>
          <div style={{
            width: '12px',
            height: '12px',
            background: '#FFC107',
            'border-radius': '50%',
            'margin-right': '5px',
          }} />
          依存関係
        </div>
      </div>
    </div>
  );
}
