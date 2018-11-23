import * as d3 from 'd3'
import _ from 'lodash'
// 状态(这里混合了ui状态和数据)
const state = {
  // type Node = {id: Number, x: Number, y: Number, inS: bool}
  nodes: [
  ],
  lastNodeId: -1,
  // type Edge = {src: Number, dst: Number, cost: Number, inS: bool}
  edges: [
  ],
  selectedNode: null,
  selectedEdge: null,
  mousedownNode: null,
  mousedownEdge: null,
  ctrlDown: false,

  dragLineVisible: false,
  dragLineSrc: null,
  dragLineDst: null
}

// 控制器
const addNode = (x, y) => {
  state.lastNodeId += 1
  const { nodes, lastNodeId: id } = state
  nodes.push({ id, x, y })
  repaint()
}
const addEdge = (src, dst, cost) => {
  const { edges } = state
  if (src === dst) return
  if (edgeId2Obj(src, dst)) return
  edges.push({ src, dst, cost })
  repaint()
}
const setEdgeCost = (src, dst, cost) => {
  edgeId2Obj(src, dst).cost = cost
  repaint()
}

// 工具函数
const id2alpha = num => {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  return alpha[num % 26] + _.repeat('\'', Math.floor(num / 26))
}
const distant = (dx, dy) => Math.sqrt(dx * dx + dy * dy)
const nodeId2Obj = id => _.find(state.nodes, node => node.id === id)
const edgeId2Obj = (src, dst) => _.find(state.edges, edge => (
  (edge.src === src && edge.dst === dst) ||
  (edge.src === dst && edge.dst === src)
))

// 动画函数
const duration = 1000
const lineToAnimate = async (src, dst) => {
  const { x: srcx, y: srcy } = nodeId2Obj(src)
  const { x: dstx, y: dsty } = nodeId2Obj(dst)
  const dx = srcx - dstx
  const dy = srcy - dsty
  const animateLine = animate.append('svg:path')
  const transition = animateLine
    .attr('class', 'edge inS')
    .attr('d', `M${srcx},${srcy}L${dstx},${dsty}`)
    .attr('stroke-dasharray', distant(dx, dy) + 'px')
    .attr('stroke-dashoffset', distant(dx, dy) + 'px')
    .transition()
    .style('stroke-dashoffset', '0')
    .duration(duration)
  return new Promise((resolve, reject) => {
    transition.on('end', () => {
      animateLine.remove()
      edgeId2Obj(src, dst).inS = true
      repaint()
      resolve()
    })
  })
}
const nodeJoinAnimate = async (id) => {
  const { x, y } = nodeId2Obj(id)
  const animateG = nodesAnimate.append('svg:g')
    .attr('transform', `translate(${x},${y})`)
  animateG.append('svg:circle')
    .attr('r', '20')
    .attr('class', 'node')
  animateG.append('svg:text')
    .attr('x', 0)
    .attr('y', 6)
    .attr('class', 'id')
    .text(id2alpha(id))
  const transition = animateG
    .transition()
    .style('fill', '#00ed08')
    .duration(duration)
  return new Promise((resolve, reject) => {
    transition.on('end', () => {
      animateG.remove()
      nodeId2Obj(id).inS = true
      repaint()
      resolve()
    })
  })
}
const revertLineAnimate = async (src, dst) => {
  const { x: srcx, y: srcy } = nodeId2Obj(src)
  const { x: dstx, y: dsty } = nodeId2Obj(dst)
  const animateLine = animate.append('svg:path')
  const transition = animateLine
    .attr('class', 'edge inS')
    .attr('d', `M${srcx},${srcy}L${dstx},${dsty}`)
    .transition()
    .style('stroke', '#000')
    .duration(duration)
  return new Promise((resolve, reject) => {
    transition.on('end', () => {
      animateLine.remove()
      edgeId2Obj(src, dst).inS = false
      repaint()
      resolve()
    })
  })
}

// ui对象
const svg = d3.select('.svgWrapper')
  .append('svg')
  .attr('oncontextmenu', 'return false;')
  .attr('width', 1200)
  .attr('height', 800)
const edges = svg.append('svg:g')
const dragLine = svg.append('svg:path')
  .attr('class', 'edge dragline hidden')
  .attr('d', 'M0,0L0,0')
const animate = svg.append('svg:g')
const nodes = svg.append('svg:g')
const nodesAnimate = svg.append('svg:g')

// 事件处理函数
const drag = d3.drag()
  .on('drag', d => {
    const { x, y } = d3.event
    d.x = x
    d.y = y
    repaint()
  })

const nodeMousedown = d => {
  d3.event.preventDefault()
  if (state.ctrlDown) {
    return
  }

  state.selectedNode = state.selectedNode === d ? null : d
  state.selectedEdge = null
  state.mousedownNode = d
  state.mousedownEdge = null

  const { x, y } = d3.event
  state.dragLineVisible = true
  state.dragLineSrc = d
  state.dragLineDst = { x, y }
  repaint()
}

const nodeMouseup = d => {
  if (state.mousedownNode) {
    const dx = state.mousedownNode.x - d.x
    const dy = state.mousedownNode.y - d.y
    const cost = Math.floor(distant(dx, dy) / 30)
    addEdge(state.mousedownNode.id, d.id, cost)
  }
}

const edgeMousedown = d => {
  d3.event.preventDefault()

  state.selectedNode = null
  state.selectedEdge = state.selectedEdge === d ? null : d
  state.mousedownNode = null
  state.mousedownEdge = d

  const newCost = window.prompt('输入新的cost', d.cost)
  setEdgeCost(d.src, d.dst, newCost && newCost >= 0 ? newCost : d.cost)
}

const mousedown = () => {
  if (state.mousedownNode || state.mousedownEdge || state.ctrlDown) {
    return
  }
  const { x, y } = d3.event
  addNode(x, y)
}

const mousemove = () => {
  if (state.mousedownNode) {
    const { x, y } = d3.event
    state.dragLineDst = { x, y }
    repaint()
  }
}

const mouseup = () => {
  if (state.mousedownNode || state.mousedownEdge) {
    state.mousedownNode = null
    state.mousedownEdge = null

    state.dragLineVisible = false
    state.dragLineSrc = null
    state.dragLineDst = null
    repaint()
  }
}

const keydown = () => {
  if (d3.event.keyCode === 17) {
    nodes.selectAll('g').call(drag)
    svg.classed('ctrl', true)
    state.ctrlDown = true
  }
  switch (d3.event.keyCode) {
    case 8: // backspace
    case 46: // delete
      if (state.selectedNode) {
        _.remove(state.nodes, node => node.id === state.selectedNode.id)
        _.remove(state.edges, edge => edge.src === state.selectedNode.id || edge.dst === state.selectedNode.id)
      }
      state.selectedEdge = null
      state.selectedNode = null
      repaint()
      break
  }
}

const keyup = () => {
  if (d3.event.keyCode === 17) {
    nodes.selectAll('g').on('.drag', null)
    svg.classed('ctrl', false)
    state.ctrlDown = false
  }
}

const onstart = async () => {
  restart()
  const { selectedNode, nodes, edges } = state
  if (!selectedNode) {
    window.alert('请选择一个起始节点')
    return
  }
  let entry = state.selectedNode.id
  const idLength = state.lastNodeId + 1
  // 图对象
  let G = _.times(idLength, () => (_.times(idLength, _.constant(Infinity))))
  edges.forEach(edge => {
    const { src, dst, cost } = edge
    G[src][dst] = cost
    G[dst][src] = cost
  })

  let allNodeId = new Set()
  nodes.forEach(node => allNodeId.add(node.id))
  let reachable = new Set()
  let distant = new Map()
  nodes.forEach(node => distant.set(node.id, Infinity))
  distant.set(entry, 0)
  let prev = {}

  while (true) {
    let minDistant = Infinity
    let u
    for (let i of allNodeId) {
      if ((!reachable.has(i)) && (distant.get(i) <= minDistant)) {
        u = i
        minDistant = distant.get(i)
      }
    }
    if (minDistant === Infinity) break
    reachable.add(u)
    await nodeJoinAnimate(u)
    for (let v of allNodeId) {
      if ((!reachable.has(v)) && (distant.get(u) + G[u][v] < distant.get(v))) {
        distant.set(v, distant.get(u) + G[u][v])
        if (prev[v] === undefined) {
          prev[v] = u
          await lineToAnimate(u, v)
        } else {
          await Promise.all([revertLineAnimate(prev[v], v), lineToAnimate(u, v)])
          prev[v] = u
        }
      }
    }
  }
  console.log(reachable)
}

const restart = () => {
  const { nodes, edges } = state
  nodes.forEach(node => { node.inS = false })
  edges.forEach(edge => { edge.inS = false })
  repaint()
}

// 重绘函数
const repaint = () => {
  // 更新节点
  const nodesJoin = nodes.selectAll('g').data(state.nodes, d => d.id)
  const g = nodesJoin.enter().append('svg:g')
    .on('mousedown', nodeMousedown)
    .on('mouseup', nodeMouseup)
  g.merge(nodesJoin)
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .attr('fill', d => {
      if (d.id === (state.selectedNode && state.selectedNode.id)) {
        return 'red'
      } else if (d.inS) {
        return '#00ed08'
      } else {
        return ''
      }
    })
  g.append('svg:circle')
    .attr('r', '20')
    .attr('class', 'node')
  g.append('svg:text')
    .attr('x', 0)
    .attr('y', 6)
    .attr('class', 'id')
    .text(d => id2alpha(d.id))
  nodesJoin.exit().remove()

  // 更新边
  const edgesJoin = edges.selectAll('g').data(state.edges)
  edgesJoin.exit().remove()
  const ge = edgesJoin.enter().append('g')
  ge.append('svg:path')
    .on('mousedown', edgeMousedown)
  ge.append('svg:text')
    .attr('class', 'cost')
  const merged = ge.merge(edgesJoin)
  merged.selectAll('path')
    .attr('class', d => d.inS ? 'edge inS' : 'edge')
    .attr('d', d => {
      const { src, dst } = d
      const { x: srcx, y: srcy } = nodeId2Obj(src)
      const { x: dstx, y: dsty } = nodeId2Obj(dst)
      return `M${srcx},${srcy}L${dstx},${dsty}`
    })
  merged.selectAll('text')
    .attr('x', d => {
      const { src, dst } = d
      return (nodeId2Obj(src).x +
        nodeId2Obj(dst).x) / 2
    })
    .attr('y', d => {
      const { src, dst } = d
      return (nodeId2Obj(src).y +
        nodeId2Obj(dst).y) / 2 - 6
    })
    .text(d => d.cost)

  // 更新drawLine
  const { dragLineVisible, dragLineSrc, dragLineDst } = state
  if (dragLineVisible) {
    dragLine.attr('class', 'edge dragline')
      .attr('d', `M${dragLineSrc.x},${dragLineSrc.y}L${dragLineDst.x},${dragLineDst.y}`)
  } else {
    dragLine.attr('class', 'edge dragline hidden')
  }
}

// 启动！
svg.on('mousedown', mousedown)
  .on('mousemove', mousemove)
  .on('mouseup', mouseup)
d3.select(window)
  .on('keydown', keydown)
  .on('keyup', keyup)
repaint()

document.querySelector('#spfAlgorithm').onclick = onstart
