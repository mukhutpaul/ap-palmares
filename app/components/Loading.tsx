
"use client"

import { CircularProgress } from 'react-loader-spinner'

export default function Chargement() {
  return (
    <CircularProgress
      height="80"
      width="80"
      color="#4fa94d"
      ariaLabel="ovel-loading"
      wrapperStyle={{}}
      wrapperClass="wrapper-class"
      visible={true}
      
    />
  )
}