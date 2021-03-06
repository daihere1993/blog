<template>
  <section class="article-edit-wrap" :class="{'editor-active': !postSaved}" >
    <div :class="{ 'title-active': !postTitleSaved}">
      <input type="text" class="form-control big only-border-bottom" v-model="postTitle" @input="updateTitle">
    </div>
    <div class="clearfix">
      <div class="half-container">
        <i class="fa fa-tags" style="margin-right:5px"></i>
        <span class="tag" v-for="tag in tags">{{tag['name']}}
          <i class="fa fa-times-circle article-editor-icon delete-tag" @click="deleteTag(tag._id)"></i>
        </span>
        <div class="tag active">
          <span v-show="!tagInput" @click="addTag()" style="cursor: pointer" >+</span>
          <input type="text" class="tag-input" v-show="tagInput" v-model="tagNew" placeholder="使用回车键提交" @keyup.13="submitTag" @keyup.esc="tagInput = false" ref="tag-input">
          <ul class="search-list reset-list" v-if="tagInput" v-show="tagsToAdd.length">
            <li class="search-item" @click="submitTag(tag['name'])" style="cursor: pointer;" v-for="tag in tagsToAdd">{{tag['name']}}</li>
          </ul>
        </div>
      </div>
      <div class="half-container">
        <button type="button" class="btn btn-save r" @click="publish">发布文章</button>
        <button type="button" class="btn btn-border r" v-show="articleIdOfPost === null" @click="deletePost">删除草稿</button>
      </div>
    </div>
    <editor class="article-editor" :content="mdContent" preview-class="markdown-body" @mdEditorInput="onMdEditorInput"></editor>
  </section>
</template>

<script>
  import Editor from '../Common/Editor.vue'
  import { mapActions, mapGetters } from 'vuex'
  import service from '../../services/posts/index'
  import { _debounce, trim } from '../../lib/utils'
  const updateTitleWithDebounce = _debounce(function (title) {
    this.submitPostTitle(title).then(() => {
      this.editPostTitle()
      this.savePostTitle()
    }).catch(err => {
      if (err) throw err
      window.alert('网络错误,标题保存失败', 'warning')
    })
  }, 500)
  const postDraft = _debounce(function (mdContent) {
    service.modifyDraftContent(this.currentPostId, mdContent).then(res => {
      if (res.success) {
        this.submitPostExcerpt({excerpt: res.data.excerpt, time: res.data.lastEditTime})
        this.savePost()
      } else {
        return Promise.reject()
      }
    }).catch(err => {
      if (err) throw err
      window.alert('网络错误!文档保存失败!请自行保存文档!', 'warning')
    })
  }, 1000, false)

  export default {
    name: 'article-editor',
    data () {
      return {
        // 用以标识 是切换文章导致的codemirror的change事件还是 手工输入引起的change事件
        // 切换文章引起的change事件则没必要对内容和title进行保存
        change: true,
        draftPublished: '',
        tags: [],
        tagsToAdd: [],
        tagNew: '',
        tagInput: false,
        mdContent: ''
      }
    },
    components: {
      Editor
    },
    mounted () {
      this.change = true
      if (this.currentPostId !== null) {
        service.getDraft(this.currentPostId).then(res => {
          if (res.success) {
            this.tagNew = ''
            this.tagInput = false
            this.tags = res.data.tags
            this.$nextTick(() => {
              this.mdContent = res.data.content
            })
          }
        }).catch(err => {
          if (err) throw err
          window.alert('网络错误,获取文章失败', 'warning')
        })
      }
    },
    computed: {
      ...mapGetters([
        'currentPostId',
        'postSaved',
        'postTitleSaved',
        'postTitle',
        'articleIdOfPost'
      ])
    },
    watch: {
      currentPostId (val) {
        this.change = true
        if (val !== null) {
          service.getDraft(val).then(res => {
            if (res.success) {
              this.tagNew = ''
              this.tagInput = false
              this.tags = res.data.tags
              this.$nextTick(() => {
                this.mdContent = res.data.content
              })
            }
          }).catch(err => {
            if (err) throw err
            window.alert('网络错误,获取文章失败', 'warning')
          })
        }
      },
      tagNew (val) {
        this.searchTags(val)
      }
    },
    methods: {
      onMdEditorInput (content) {
        if (this.change === true) {
          this.change = false
          return
        }
        if (this.postSaved) {
          this.editPost()
        }
        postDraft.call(this, content)
      },
      ...mapActions([
        'editPost',
        'savePost',
        'editPostTitle',
        'savePostTitle',
        'deletePost',
        'publishPost',
        'submitPostTitle',
        'submitPostExcerpt',
        'postTagsModify'
      ]),
      submitTag (val) {
        let self = this

        this.tagInput = false
        let tag
        if (typeof val === 'string') {
          tag = val
        } else {
          tag = trim(this.tagNew)
        }
        this.tagNew = ''
        if (tag === '') {
          return
        }
        service.createTags(tag).then(res => {
          let id = res.data._id
          if (self.tags.some(item => item.id === id)) {
            return
          }
          let newTagArr = self.tags.map(item => {
            return item._id
          })
          newTagArr.push(id)
          return service.modifyDraftTags(self.currentPostId, newTagArr).then(res => {
            if (res.success) {
              self.tags = res.data.tags
              self.postTagsModify(res.data.lastEditTime)
            }
          }).catch(err => {
            if (err) throw err
            window.alert('网络错误,增加标签失败', 'warning')
          })
        }).catch(err => {
          if (err) throw err
          window.alert('网络错误,增加标签失败', 'warning')
        })
      },
      deleteTag (id) {
        let newTagArr = []
        for (let i of this.tags) {
          if (i._id !== id) {
            newTagArr.push(i._id)
          }
        }
        return service.modifyDraftTags(this.currentPostId, newTagArr).then(res => {
          if (res.success) {
            this.tags = res.data.tags
            this.postTagsModify(res.data.lastEditTime)
          }
        }).catch(err => {
          if (err) throw err
          window.alert('网络错误,增加标签失败', 'warning')
        })
      },
      publish () {
        if (!this.postSaved || !this.postTitleSaved) {
          window.alert('当前文章正在保存中,请稍后重试', 'warning')
          return
        }
        this.publishPost().then(() => {
          window.alert('发布成功')
        }).catch(err => {
          window.alert(err.error_message && err.error_message.error + '' || '网络错误,保存失败', 'warning')
        })
      },
      updateTitle (e) {
        // 这里没有使用vuex官方实例当中的计算属性的setters再配合vue的debounce
        // 而是使用自己的debounce函数是因为
        // 使用计算属性的话,只要依赖项有变化,就会引起setters执行
        // 这就导致切换文章时,title也被上传一次,
        // 这与设想的只在用户更改后才上传的逻辑相违背
        updateTitleWithDebounce.call(this, e.target.value)
      },
      addTag () {
        this.tagInput = true
        this.tagNew = ''
        this.searchTags('')

        this.$nextTick(() => {
          // tag-input为获得焦点的状态
          this.$refs.tagInput.focus()
        })
      },
      searchTags (val) {
        service.searchTagWithWord(val).then(res => {
          if (res.success) {
            this.tagsToAdd = res.data
          }
        })
      }
    }
  }
</script>

<style lang="stylus">
  @import '../../stylus/_settings.styl'
  .article-edit-wrap 
    display flex
    flex-direction column
    height 100%
  .article-editor
    display flex
    flex-direction column
    .CodeMirror 
      flex-shrink 1
      overflow scroll
  .title-active
    .big
      border 1px solid $yellow
  .big
    transition border 0.5s
    padding 13px 20px 13px 30px
    font-size 26px
  .only-border-bottom
    border 1px solid transparent
    border-bottom 1px solid $border
  .half-container
    float left
    box-sizing border-box
    width 50%
    padding 15px
    .btn+.btn
      margin-right 20px
  .tag
    position relative
    display inline-block
    padding 3px 0
    font-size 14px
    color $light
    border-bottom 2px solid $light
    margin-top 5px
    margin-right 20px
    .article-editor-icon
      display none
    &:hover
      color $main-color
      border-bottom 2px solid $main-color
      .article-editor-icon
        display inline
        cursor: pointer
    &.active
      color $main-color
      border-bottom 2px solid $main-color
      position relative
  .search-list
    position absolute
    top 25px
    left -6px
    z-index 100
    width 100%
    padding 5px
    background white
    border: 1px solid $border
    border-radius 4px
    box-shadow 0 6px 12px rgba(0,0,0,.03)
  .search-item
    color $light
    padding-left 4px
    &:hover
      color  $main-color
    &+&
      padding-top 10px
  .delete-tag
    display none
    position absolute
    right -8px
    top -3px
    font-size 12px
  .tag-input
    border none
    background transparent
    color $main-color
    font-size 14px
    outline 0
  .editor-toolbar
    border-left 0
  .editor-active
    .CodeMirror
      border 1px solid $yellow
  .CodeMirror
    transition border 0.5s
    border-left 1px solid transparent
  .CodeMirror-sided
    box-sizing border-box
</style>