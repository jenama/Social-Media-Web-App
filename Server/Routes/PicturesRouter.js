const express = require('express')
const router = express.Router()

//pg-promise request
const {db} = require('../../Database/database')

//DB Query functions
const getPictureById = async (req, res) => {
  try {
    const requestQuery = `
      SELECT picture_link, picture_date, album_id, comment, comment_date, liker_username
      FROM pictures
      FULL OUTER JOIN comments ON (comments.picture_id = pictures.id)
      FULL OUTER JOIN likes ON (likes.picture_id = pictures.id)
      WHERE pictures.id = $1`
    const pic = await db.any(requestQuery, [req.params.pictureid])
    res.json({
      status: 'success',
      message: `retrieved picture with ID ${req.params.pictureid}`,
      body: pic
    })
  } catch (err) {
    console.log(err)
    res.status(500)
    res.send({
        status: 'failed',
        message: 'Something went wrong'
    })
  }
}

const getPicturesByAlbum = async (req, res) => {
  try {
    const requestQuery = `
      SELECT pictures.id, picture_link, picture_date, album_id, comment, comment_date, liker_username
      FROM pictures
      FULL OUTER JOIN comments ON (comments.picture_id = pictures.id)
      FULL OUTER JOIN likes ON (likes.picture_id = pictures.id)
      WHERE album_id = $1`
    const picsFromAlbum = await db.any(requestQuery, [req.params.albumid])
    res.json({
      status: 'success',
      message: `retrieved pictures from album with ID ${req.params.albumid}`,
      body: picsFromAlbum
    })
  } catch(err) {
    console.log(err)
    res.status(500)
    res.send({
        status: 'failed',
        message: 'Something went wrong'
    })
  }
}

const postPicture = async (req, res) => {
  try {
    const today = new Date()
    //const date = `${today.getFullYear()}-${(today.getMonth() + 1)}-${today.getDay()}`
    const date = today.toLocaleDateString()
    const insertQuery = `
      INSERT INTO pictures (album_id, picture_link)
      VALUES($1, $2)
    `
    await db.none(insertQuery, [req.params.albumid, req.body.pictureLink])
    res.json({
      status: 'success',
      message: `posted picture to album with ID ${req.params.albumid}`,
      body: { albumId: req.params.albumid, pictureLink: req.body.pictureLink, pictureDate: date }
    })
  } catch (err) {
    console.log(err)
    res.status(500)
    res.send({
      status:'failed',
      message: 'Something went wrong'
    })
  }
}

const deletePicture = async (req, res) => {
  try {
    const deleteQuery = `
      DELETE from pictures WHERE id = $1
    `
    await db.none(deleteQuery, [req.params.pictureid])
    res.json({
      status:'success',
      message: `deleted picture with ID ${req.params.pictureid}`
    })
  } catch (err) {
    res.status(500)
    res.send({
      status: 'failed',
      message: 'Something went wrong'
    })
  }
}

//Authentication
const checkValidAuthenticationBody = (req, res, next) => {
    const username = req.body.loggedUsername
    const password = req.body.loggedPassword
    if (!username || !password) {
        res.status(400)
        res.json({
            status: 'failed',
            message: 'Missing authentication information'
        })
    } else {
        req.loggedUsername = username.toLowerCase()
        req.loggedPassword = password
        next()
    }
}

const checkIfUsernameExists = async (req, res, next) => {
    try {
        const user = await db.one('SELECT * FROM users WHERE username = $1', [req.loggedUsername])
        req.userExists = true
        req.targetUser = user
        next()
    } catch(err) {
        if (err.received === 0) {
            req.userExists = false
            next()
        } else {
            res.status(500)
            console.log(err)
            res.json({
                status: 'failed',
                message: 'Something went wrong!'
            })
        }
    }
}

const authenticateUser = (req, res, next) => {
  if (req.userExists) {
      if (req.targetUser.username === req.loggedUsername
       && req.targetUser.user_password === req.loggedPassword) {
        next()
      } else {
          res.status(401)
          res.json({
              status: 'failed',
              message: 'Not authorized to accomplish the request'
          })
      }
  } else {
      res.status(404)
      res.json({
          status: 'failed',
          message: 'User Does not exist'
      })
  }
}

//Routes
router.get('/albums/:albumid', getPicturesByAlbum)
router.get('/:pictureid', getPictureById)
router.post('/albums/:albumid', checkValidAuthenticationBody, checkIfUsernameExists, authenticateUser, postPicture)
router.put('/delete/:pictureid', checkValidAuthenticationBody, checkIfUsernameExists, authenticateUser, deletePicture)

module.exports = router;
