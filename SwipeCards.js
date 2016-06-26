/* Gratefully copied from https://github.com/brentvatne/react-native-animated-demo-tinder */
'use strict';

import React, {Component} from 'react';

import {
    StyleSheet,
    Text,
    View,
    Animated,
    PanResponder,
    Image
} from 'react-native';

import clamp from 'clamp';

import Defaults from './Defaults.js';

var SWIPE_THRESHOLD = 120;

class SwipeCards extends Component {
  constructor(props) {
    super(props);

    this.state = {
      pan: new Animated.ValueXY(),
      yupOpacity: new Animated.Value(1),
      nopeOpacity: new Animated.Value(1),
      enter: new Animated.Value(0.5),
      card: this.props.cards[0],
    }
  }

  _goToNextCard() {
    let currentCardIdx = this.props.cards.indexOf(this.state.card);
    let newIdx = currentCardIdx + 1;

    // Checks to see if last card.
    // If props.loop=true, will start again from the first card.
    let card = newIdx > this.props.cards.length - 1
      ? this.props.loop ? this.props.cards[0] : null
      : this.props.cards[newIdx];

    this.setState({
      card: card
    });
  }

  componentDidMount() {
    this._animateEntrance();
  }

  _animateEntrance() {
    Animated.spring(
      this.state.enter,
      { toValue: 1, friction: 8 }
    ).start();
  }

  componentWillReceiveProps(nextProps){
    if(nextProps.cards && nextProps.cards.length > 0){
      this.setState({
        card: nextProps.cards[0]
      })
    }
  }

  componentWillMount() {
    this._panResponder = PanResponder.create({
      onMoveShouldSetResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,

      onPanResponderGrant: (e, gestureState) => {
        this.state.pan.setOffset({x: this.state.pan.x._value, y: this.state.pan.y._value});
        this.state.pan.setValue({x: 0, y: 0});
      },

      onPanResponderMove: (e, gestureState) => { 
        this.state.pan.x.setValue(gestureState.dx);
        this.state.pan.y.setValue(gestureState.dy);
        this.state.yupOpacity.setValue(gestureState.dy < -SWIPE_THRESHOLD ? 0 : gestureState.dx/150);
        this.state.nopeOpacity.setValue(gestureState.dy < -SWIPE_THRESHOLD ? 0 : -gestureState.dx/150);
      },

      onPanResponderRelease: (e, {vx, vy}) => {
        this.state.pan.flattenOffset();
        var velocity;

        if (vx >= 0) {
          velocity = clamp(vx, 3, 5);
        } else if (vx < 0) {
          velocity = clamp(vx * -1, 3, 5) * -1;
        }

        if (this.state.pan.y._value < -SWIPE_THRESHOLD) {
          this.props.handleDontCare(this.state.card);
          
          Animated.spring(this.state.pan, {
            toValue: {x: this.state.pan.x._value, y: -600}
          }).start(this._resetState.bind(this));
        } else if (Math.abs(this.state.pan.x._value) > SWIPE_THRESHOLD) {

          this.state.pan.x._value > 0
            ? this.props.handleYup(this.state.card)
            : this.props.handleNope(this.state.card)

          this.props.cardRemoved
            ? this.props.cardRemoved(this.props.cards.indexOf(this.state.card))
            : null

          Animated.decay(this.state.pan, {
            velocity: {x: velocity, y: vy},
            deceleration: 0.98
          }).start(this._resetState.bind(this))
        } else {
          Animated.parallel([
            Animated.spring(this.state.pan, {
              toValue: {x: 0, y: 0},
              friction: 4
            }),
            Animated.spring(this.state.yupOpacity, {
              toValue: 0,
              friction: 4
            }),
            Animated.spring(this.state.nopeOpacity, {
              toValue: 0,
              friction: 4
            })
          ]).start()
        }
      }
    })
  }

  _resetState() {
    this.state.pan.setValue({x: 0, y: 0});
    this.state.enter.setValue(0);
    this.state.yupOpacity.setValue(0);
    this.state.nopeOpacity.setValue(0);
    this._goToNextCard();
    this._animateEntrance();
  }

  renderNoMoreCards() {
    if (this.props.renderNoMoreCards)
      return this.props.renderNoMoreCards();

    return (
      <Defaults.NoMoreCards />
    )
  }

  renderCard(cardData) {
    return this.props.renderCard(cardData)
  }

  render() {
    let { pan, enter, } = this.state;

    let [translateX, translateY] = [pan.x, pan.y];

    let rotate = pan.x.interpolate({inputRange: [-200, 0, 200], outputRange: ["-30deg", "0deg", "30deg"]});
    let opacity = pan.x.interpolate({inputRange: [-200, 0, 200], outputRange: [0.5, 1, 0.5]});
    let scale = enter;

    let animatedCardstyles = {transform: [{translateX}, {translateY}, {rotate}, {scale}], opacity};

    let dontCareOpacity = pan.y.interpolate({inputRange: [-150, 0], outputRange: [1, 0]});
    let dontCareScale = pan.y.interpolate({inputRange: [-150, 0], outputRange: [1, 0.5], extrapolate: 'clamp'});
    let animatedDontCareStyles = {transform: [{scale: dontCareScale}], opacity: dontCareOpacity}

    let yupScale = pan.x.interpolate({inputRange: [0, 150], outputRange: [0.5, 1], extrapolate: 'clamp'});
    let animatedYupStyles = {transform: [{scale: yupScale}], opacity: this.state.yupOpacity}

    let nopeScale = pan.x.interpolate({inputRange: [-150, 0], outputRange: [1, 0.5], extrapolate: 'clamp'});
    let animatedNopeStyles = {transform: [{scale: nopeScale}], opacity: this.state.nopeOpacity}

    return (
      <View style={styles.container}>
        { this.state.card
            ? (
            <Animated.View style={[styles.card, animatedCardstyles]} {...this._panResponder.panHandlers}>
              {this.renderCard(this.state.card)}
            </Animated.View>
            )
            : this.renderNoMoreCards() }


        { this.props.renderNope
          ? this.props.renderNope(pan)
          : (
              this.props.showNope
              ? (
                <Animated.View style={[styles.nope, animatedNopeStyles]}>
                  <Text style={styles.nopeText}>{this.props.noText ? this.props.noText : "Nope!"}</Text>
                </Animated.View>
                )
              : null
            )
        }

        { this.props.renderDontCare
          ? this.props.renderDontCare(pan)
          : (
              this.props.showDontCare
              ? (
                <Animated.View style={[styles.dontCare, animatedDontCareStyles]}>
                  <Text style={styles.dontCareText}>{this.props.dontCareText ? this.props.dontCareText : "Don't Care"}</Text>
                </Animated.View>
                )
              : null
            )
        }

        { this.props.renderYup
          ? this.props.renderYup(pan)
          : (
              this.props.showYup
              ? (
                <Animated.View style={[styles.yup, animatedYupStyles]}>
                  <Text style={styles.yupText}>{this.props.yupText? this.props.yupText : "Yup!"}</Text>
                </Animated.View>
              )
              : null
            )
        }

      </View>
    );
  }
}

SwipeCards.propTypes = {
  cards: React.PropTypes.array,
  renderCards: React.PropTypes.func,
  loop: React.PropTypes.bool,
  renderNoMoreCards: React.PropTypes.func,
  showYup: React.PropTypes.bool,
  showNope: React.PropTypes.bool,
  showDontCare: React.PropTypes.bool,
  handleYup: React.PropTypes.func,
  handleNope: React.PropTypes.func,
  handleDontCare: React.PropTypes.func,
  yupText: React.PropTypes.string,
  noText: React.PropTypes.string,
  dontCareText: React.PropTypes.string
};

SwipeCards.defaultProps = {
  loop: false,
  showYup: true,
  showNope: true,
  showDontCare: true
};


var styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF'
  },
  yup: {
    borderColor: 'green',
    borderWidth: 2,
    position: 'absolute',
    padding: 20,
    bottom: 20,
    borderRadius: 5,
    right: 20,
  },
  yupText: {
    fontSize: 16,
    color: 'green',
  },
  dontCare: {
    borderColor: 'grey',
    borderWidth: 2,
    position: 'absolute',
    padding: 20,
    bottom: 20,
    borderRadius: 5,
    left: 90,
  },
  dontCareText: {
    fontSize: 16,
    color: 'grey',
  },
  nope: {
    borderColor: 'red',
    borderWidth: 2,
    position: 'absolute',
    bottom: 20,
    padding: 20,
    borderRadius: 5,
    left: 20,
  },
  nopeText: {
    fontSize: 16,
    color: 'red',
  }
});

export default SwipeCards
