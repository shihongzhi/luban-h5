import { mapState, mapActions } from 'vuex'
import Shape from '../../support/shape'
import ContextMenu from '../../support/contexmenu'

export default {
  props: ['elements', 'handleClickElementProp', 'handleClickCanvasProp'],
  data: () => ({
    vLines: [],
    hLines: [],
    contextmenuPos: []
  }),
  computed: {
    ...mapState('editor', ['editingElement'])
  },
  methods: {
    ...mapActions('editor', [
      'setEditingElement',
      'setElementPosition',
      'setElementShape',
      'recordElementRect',
      'elementManager'
    ]),
    // TODO #!zh: 优化代码
    // generate vertical line
    drawVLine (newLeft) {
      this.vLines = [{ left: newLeft }]
    },
    clearVLine () {
      this.vLines = []
    },
    // generate horizontal line
    drawHLine (newTop) {
      this.hLines = [{ top: newTop }]
    },
    clearHLine () {
      this.hLines = []
    },
    calcVHLine (isPointMove) {
      const uuid = this.editingElement.uuid
      let xCoords = []
      let yCoords = []
      this.elements.filter(e => e.uuid !== uuid).forEach(e => {
        const width = e.commonStyle.width
        const left = e.commonStyle.left
        const height = e.commonStyle.height
        const top = e.commonStyle.top

        xCoords = [
          ...xCoords,
          left,
          left + (width / 2),
          left + width
        ]
        yCoords = [
          ...yCoords,
          top,
          top + (height / 2),
          top + height
        ]
      })

      const eleft = this.editingElement.commonStyle.left
      const etop = this.editingElement.commonStyle.top
      const ewidth = this.editingElement.commonStyle.width
      const eheight = this.editingElement.commonStyle.height
      let exCoords = [eleft, eleft + (ewidth / 2), eleft + ewidth]
      let eyCoords = [etop, etop + (eheight / 2), etop + eheight]
      let hasVLine = false
      let hasHLine = false
      exCoords.forEach(v => {
        xCoords.forEach(x => {
          if (Math.abs(v - x) <= 5) {
            if (isPointMove) {
              this.setElementPosition({ width: ewidth + x - v })
            } else {
              this.setElementPosition({ left: x - (v - eleft) })
            }
            this.drawVLine(x)
            hasVLine = true
          }
        })
      })
      eyCoords.forEach(v => {
        yCoords.forEach(y => {
          if (Math.abs(v - y) <= 5) {
            if (isPointMove) {
              this.setElementPosition({ height: eheight + y - v })
            } else {
              this.setElementPosition({ top: y - (v - etop) })
            }
            this.drawHLine(y)
            hasHLine = true
          }
        })
      })
      if (!hasVLine) {
        this.clearVLine()
      }
      if (!hasHLine) {
        this.clearHLine()
      }
    },
    /**
     * #!zh: 在元素移动过程中，计算和生成辅助线
     */
    handleElementMove (pos) {
      this.setElementPosition(pos)
      this.calcVHLine(false)
    },
    handlePointMove (pos) {
      this.setElementPosition(pos)
      this.calcVHLine(true)
    },
    bindContextMenu (e) {
      // 优化右击菜单的显示，去除冗余的无效逻辑
      const { x, y } = this.$el.getBoundingClientRect()
      this.contextmenuPos = [e.clientX - x, e.clientY - y]
      // console.log(e.target)
      // console.log(e.target.classList)
      // // e.preventDefault() // 不显示默认的右击菜单
      // if (
      //   e.target.classList.contains('element-on-edit-canvas') ||
      //   e.target.parentElement.classList.contains('element-on-edit-canvas')
      // ) {
      //   const { x, y } = this.$el.getBoundingClientRect()
      //   console.log(x, y)
      //   this.contextmenuPos = [e.clientX - x, e.clientY - y]
      // } else {
      //   this.hideContextMenu()
      // }
    },
    hideContextMenu () {
      this.contextmenuPos = []
    },
    handleClickCanvas (e) {
      if (!e.target.classList.contains('element-on-edit-canvas')) {
        this.setEditingElement()
      }
    },
    /**
     * #!zh: renderCanvas 渲染中间画布
     * elements
     * @param {*} h
     * @param {*} elements
     * @returns
     */
    renderCanvas (h, elements) {
      return (
        <div
          style={{ height: '100%', position: 'relative' }}
          onClick={(e) => {
            this.hideContextMenu()
            this.handleClickCanvas(e)
          }}
          onContextmenu={e => {
            e.preventDefault()
            e.stopPropagation()
            // this.bindContextMenu(e)
          }}
        >
          {
            elements.map((element, index) => {
              if (element.name === 'lbp-background') {
                return h('lbp-background', {
                  props: element.getProps()
                })
              }
              const data = {
                style: {
                  width: '100%',
                  height: '100%'
                },
                // 添加 class 的原因：与 handleClickCanvasProp 配合,
                // 当点击编辑画布上的其它区域（clickEvent.target.classList 不包含下面的 className）的时候，设置 editingElement=null
                class: 'element-on-edit-canvas',
                props: {
                  ...element.getProps(), // #6 #3,
                  editorMode: 'edit'
                },
                // nativeOn: {
                //   contextmenu: e => {
                //     this.bindContextMenu(e)
                //   }
                // },
                on: {
                  // 高亮当前点击的元素
                  // click: () => this.setEditingElement(element)
                  input: ({ value, pluginName }) => {
                    if (pluginName === 'lbp-text') {
                      element.pluginProps.text = value
                    }
                  }
                }
              }
              return (
                <Shape
                  style={element.getStyle({ position: 'absolute' })}
                  defaultPosition={element.commonStyle} // {top, left}
                  element={element}
                  active={this.editingElement === element}
                  handleMousedownProp={() => {
                    // 在 shape 上面添加 mousedown，而非 plugin 本身添加 onClick 的原因：
                    // 在 mousedown 的时候，即可激活 editingElement(当前选中元素)
                    // 这样，就不用等到鼠标抬起的时候，也就是 plugin 的 onClick 生效的时候，才给选中的元素添加边框等选中效果
                    this.setEditingElement(element)
                  }}
                  // TODO 矩形四周的点叫什么？暂时叫 Point 吧
                  handlePointMoveProp={this.handlePointMove}
                  handleElementMoveProp={this.handleElementMove}
                  handleElementMouseUpProp={() => {
                    this.recordElementRect()
                  }}
                  handlePointMouseUpProp={() => {
                    this.recordElementRect()
                  }}
                  nativeOnContextmenu={e => {
                    this.bindContextMenu(e)
                  }}
                >
                  {h(element.name, data)}
                </Shape>
              )
            })
          }
          {
            this.vLines.map(line => (
              <div class="v-line" style={{ left: `${line.left}px` }}></div>
            ))
          }
          {
            this.hLines.map(line => (
              <div class="h-line" style={{ top: `${line.top}px` }}></div>
            ))
          }
          {
            this.contextmenuPos.length
              ? <ContextMenu
                position={this.contextmenuPos}
                onSelect={({ item, key, selectedKeys }) => {
                  this.elementManager({ type: key })
                  this.hideContextMenu()
                }}
                onHideMenu={this.hideContextMenu}
              /> : null
          }
        </div>
      )
    }
  },
  render (h) {
    return this.renderCanvas(h, this.elements)
  }
}
