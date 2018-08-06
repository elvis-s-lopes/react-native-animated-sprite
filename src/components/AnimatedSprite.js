"use strict";

import React from 'react';
import {
  PanResponder,
  TouchableOpacity,
  View,
  Image,
  Platform
} from 'react-native';

import WebImage from 'react-native-web-image';

import PropTypes from 'prop-types';

import shallowCompare from 'react-addons-shallow-compare';
import _ from 'lodash';
import randomstring from 'random-string';

class AnimatedSprite extends React.Component {
  constructor (props) {
    super(props);

    this.state = {
      top: props.coordinates.top,
      left: props.coordinates.left,
      scale: 1,
      opacity: props.opacity,
      width: props.size.width,
      height: props.size.height,
      rotate: props.rotate,
      frameIndex: this.props.animationFrameIndex,
    };

    this.sprite = this.props.sprite;
    this.frameIndex = 0;
    this.defaultAnimationInterval = undefined;
    this.fps = 8;
    this.endValues = undefined;
    // used for panResponder
    this.spriteStyles = {};
    this.panResponder = {};
  }

  componentWillMount () {
    if (this.props.draggable) {
      this.initPanResponder();
    }

    this.tweenablValues = {
      top: this.state.top,
      left: this.state.left,
      scale: this.state.scale,
      opacity: this.state.opacity,
    };
  }

  componentDidMount () {
    this.startAnimation();
    // part of PanResponder and drag behavior
    if (this.spriteComponentRef) {
      this.spriteComponentRef.setNativeProps(this.spriteStyles);
    }
    if (this.props.tweenStart === 'fromMount' && this.props.tweenOptions !== null) {
      this.startTween();
    }
    this.fps = this.props.fps || this.fps;
  }

  componentWillReceiveProps (newProps) {
    this.setState({
      top: newProps.coordinates.top,
      left: newProps.coordinates.left,
      scale: 1,
      opacity: newProps.opacity,
      width: newProps.size.width,
      height: newProps.size.height,
      rotate: newProps.rotate,
      frameIndex: newProps.animationFrameIndex
    });
  }

  shouldComponentUpdate (nextProps, nextState) {
     return shallowCompare(this, nextProps, nextState);
  }

  componentWillUnmount () {
    clearInterval(this.defaultAnimationInterval);
  }

  initPanResponder () {
    // note that with PanResponder we setNativeProps for performance reasons,
    // as stated by FB.
    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gestureState) => {
        this.handlePanResponderMove(e, gestureState);},
      onPanResponderRelease: (e, gestureState) => {
        this.handlePanResponderEnd(e, gestureState);},
      onPanResponderTerminate:
        (e, gestureState) => {
        this.handlePanResponderEnd(e, gestureState);},
    });
    // spriteStyles used by PanResponder
    this.previousTop = this.state.top._value;
    this.previousLeft =  this.state.left._value;
    this.spriteStyles = {
      style: {
        left: this._previousLeft,
        top: this._previousTop,
        width: this.state._width,
        height: this.state._height,
      },
    };
  }

  updateNativeStyles () {
    this.spriteComponentRef && this.spriteComponentRef.setNativeProps(this.spriteStyles);
  }

  handleStartShouldSetPanResponder (/*e, gestureState*/) {
    return true;
  }

  handleMoveShouldSetPanResponder (/*e, gestureState*/) {
    return true;
  }

  handlePanResponderMove (e, gestureState) {
    this.spriteStyles.style.left = this.previousLeft + gestureState.dx;
    this.spriteStyles.style.top = this.previousTop + gestureState.dy;
    this.updateNativeStyles();
  }

  handlePanResponderEnd (e, gestureState) {
    // do anything you want onPanResponderRelease
    this.previousLeft += gestureState.dx;
    this.previousTop += gestureState.dy;
    // PanResponder mutates state directly
    this.state.top._value = this.spriteStyles.style.top;
    this.state.left._value = this.spriteStyles.style.left;
    if (this.props.currentLocation) {
      this.props.currentLocation(this.spriteStyles.style.left, this.spriteStyles.style.top);
    }
  }
  
  animationSequenceComplete(frameIndex) {
    return (frameIndex > (this.props.animationFrameIndex.length - 1));
  }
  
  startAnimation () {
    this.fps = this.props.fps || this.fps;
    this.frameIndex = -1;
    clearInterval(this.defaultAnimationInterval);
    this.defaultAnimationInterval = setInterval(()=>{
      this.frameIndex++;
      if (this.animationSequenceComplete(this.frameIndex)) {
        this.frameIndex = this.frameIndex - 1;
        if (this.props.loopAnimation) {
            this.frameIndex = 0;
        } else {
          // not looping animation
          clearInterval(this.defaultAnimationInterval);
          if (this.props.onAnimationFinish) {
             this.props.onAnimationFinish(this.props.spriteUID);
          }
          return;
        }
      }
      this.setState({
        frameIndex: this.props.animationFrameIndex[this.frameIndex]
      });
    }, 1000 / this.fps);
  }

  getCoordinates () {
    return { top: this.state.top._value, left: this.state.left._value};
  }

  getStyle () {
    const opacity = !this.props.visible ? new Animated.Value(0) : this.state.opacity;
    const rotateAxes = _.map(this.state.rotate, axis => axis);
    const transform = _.concat([{scale: this.state.scale}], rotateAxes);
    return (
      // TODO: this.props.visible part of hack to what may be a
      // RN bug associated with premiture stopping of Tween and removing
      // The related component
      {
        opacity,
        transform,
        top: this.state.top,
        left: this.state.left,
        width: this.state.width,
        height: this.state.height,
        position: 'absolute',
      }

    );
  }

  render () {
    return (
      <View
        {...this.panResponder.panHandlers}
        style={this.getStyle()}
        ref={(sprite) => {
          this.spriteComponentRef = sprite;
        }}>
          {Platform.OS === 'ios' ? (
            <Image
            source={this.sprite.frames[this.state.frameIndex]}
            style={{
              width: this.state.width,
              height: this.state.height,
            }}
            resizeMode={FastImage.resizeMode.contain}
          />
          ) :(
            <WebImage
            source={this.sprite.frames[this.state.frameIndex]}
            style={{
              width: this.state.width,
              height: this.state.height,
            }}
          />
          )}
      </View>
    );
  }
}

AnimatedSprite.propTypes = {
  sprite: PropTypes.object.isRequired,
  coordinates: PropTypes.shape({
    top: PropTypes.number,
    left: PropTypes.number,
  }).isRequired,
  size: PropTypes.shape({
    width: PropTypes.number,
    height: PropTypes.number,
  }).isRequired,
  animationFrameIndex: PropTypes.array.isRequired,

  rotate: PropTypes.arrayOf(PropTypes.object),
  opacity: PropTypes.number,
  spriteUID: PropTypes.string,
  draggable: PropTypes.bool,
  onPress: PropTypes.func,
  onPressIn: PropTypes.func,
  onPressOut: PropTypes.func,
  loopAnimation: PropTypes.bool,
  timeSinceMounted: PropTypes.func,
  currentLocation: PropTypes.func,
  tweenStart: PropTypes.oneOf(['fromMount','fromMethod', 'fromPress']),
  // probably should validate tweenOptions, since Tweens.js uses them
  // and expects a certian shape.
  tweenOptions: PropTypes.object,
  stopAutoTweenOnPressIn: PropTypes.bool,
  onTweenStopped: PropTypes.func,
  onTweenFinish: PropTypes.func,
  onAnimationFinish: PropTypes.func,
  visible: PropTypes.bool,
  fps: PropTypes.number,
};

AnimatedSprite.defaultProps = {
  draggable: false,
  spriteUID: randomstring({ length: 7 }),
  rotate: [{rotateY: '0deg'}],
  opacity: 1,
  fps: 10,
  visible: true,
};

export default AnimatedSprite;

