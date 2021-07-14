import React from 'react'
import PropTypes from 'prop-types'

const Title = ({ className, children }) => (
  <h1 className={className}>{children}</h1>
)

Title.defaultProps = {
  className: '',
  children: [],
}

Title.propTypes = {
  className: PropTypes.string,
  children: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.arrayOf(PropTypes.node),
  ]),
}

export default Title
