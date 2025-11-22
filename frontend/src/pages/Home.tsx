import React from 'react'
import './Home.css'
import testPicture from '../assets/testFolder/test-picture.png'
import testPicture2 from '../assets/testFolder/test-picture-2.webp'

export default function Home() {
  return (
    <div>
        <p className='home-test-text'>Home.tsx</p>
        <p className='home-test-text'>image test:</p>

        <img src={testPicture}/>
                <img src={testPicture2}/>

    </div>
  )
}
