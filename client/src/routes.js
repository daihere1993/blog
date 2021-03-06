import List from 'components/PostList.vue'
import Post from 'components/Post.vue'
import Tag from 'components/Tag.vue'
import Me from 'components/Me.vue'

const routes = [
  { path: '/', redirect: '/posts' },
  { path: '/posts', component: List },
  { path: '/post/:postId', component: Post },
  { path: '/tags', component: Tag },
  { path: '/me', component: Me }
]

export default routes