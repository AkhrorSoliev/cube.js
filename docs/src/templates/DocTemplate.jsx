import React, { Component } from 'react';
import { graphql } from 'gatsby';
import Helmet from 'react-helmet';
import ReactHtmlParser from 'react-html-parser';
import { scroller } from 'react-scroll';
import { Icon } from 'antd';
import cx from 'classnames';
import PropTypes from 'prop-types';
import kebabCase from 'lodash/kebabCase';
import get from 'lodash/get';
import last from 'lodash/last';
import { renameCategory } from '../../rename-category';

import ScrollLink, { SCROLL_OFFSET } from '../components/templates/ScrollSpyLink';

import styles from '../../static/styles/index.module.scss';

const mdContentCallback = () => {
  const accordionTriggers = document.getElementsByClassName('accordion-trigger');

  Array.prototype.forEach.call(accordionTriggers, item => {
    item.onclick = function (e) {
      e.preventDefault();
      const target = document.getElementById(item.id + '-body');
      target.classList.toggle('active');
    }
  })
}

const repoBaseUrl = "https://github.com/cube-js/cube.js/blob/master";
const getGithubUrl = (fileAbsolutePath) => {
  const arr = fileAbsolutePath.replace(/(.*)cube\.js\/(.*)/g, '$2').split("/");
  return [repoBaseUrl, ...arr.slice(arr.indexOf('cube.js') + 1)].join("/");
}

class DocTemplate extends Component {
  componentWillMount() {
    const { markdownRemark = {} } = this.props.data;
    const { html, frontmatter } = markdownRemark;
    this.props.changePage({ scope: frontmatter.scope, category: renameCategory(frontmatter.category), noscrollmenu: false });
    this.createAnchors(html, frontmatter.title, getGithubUrl( this.props.pathContext.fileAbsolutePath));
  }

  componentDidMount() {
    window.Prism && window.Prism.highlightAll();
    this.scrollToHash();
    mdContentCallback();
  }

  componentDidUpdate() {
    this.scrollToHash();
  }

  scrollToHash = () => {
    setTimeout(() => {
      const nodeID = get(this.props, 'location.hash', '').slice(1);
      if (nodeID) {
        scroller.scrollTo(nodeID, { offset: SCROLL_OFFSET });
      }
    }, 100)
  }

  createAnchors = (html, title, githubUrl) => {
    if (!html) {
      this.props.setScrollSections([]);
      return;
    }

    // the code below transforms html from markdown to section-based html
    // for normal scrollspy
    const rawNodes = ReactHtmlParser(html);
    const sectionTags = [
      {
        id: 'top',
        type: 'h1',
        className: styles.topSection,
        nodes: [
          React.createElement('p', { key: 'edit-page', className: styles.editPage }, <a href={githubUrl}> <Icon type="github" width={20} height={20} /> Edit this page </a>),
          React.createElement('h1', { key: 'top', className: styles.topHeader }, title)
        ],
        title: title
      }
    ];

    let currentParentID;
    let currentID = 'top';

    rawNodes.forEach(item => {
      let linkedHTag;

      // This skips over any inline-comments in the Markdown source, such as
      // `<!-- prettier-ignore-start -->`
      if (!item) {
        return;
      }

      if (item.type === 'p' && item.props.children.length === 1 && item.props.children[0].type === 'a') {
        item = <div
          id={`${item.key}:block-link`}
          key={`${item.key}:block-link`}
          className="block-link">
          {item.props.children[0]}
        </div>;
      }

      if (item.type === 'table') {
        item = React.createElement('div', {
          id: `${item.key}:wrapper`,
          key: `${item.key}:wrapper`,
          className: 'table-wrapper',
          children: [
            item,
            React.createElement('div', {
              id: `${item.key}:padding`,
              key: `${item.key}:padding`,
            }),
          ],
        });
      }

      if (item.type === 'h2' || item.type === 'h3') {
        let className = '';
        const prevSection = last(sectionTags);

        const isPreviousSectionClearable =
          (prevSection.type === 'h1' || prevSection.type === 'h2') && (
          (prevSection.type === 'h1' && prevSection.nodes.length > 2) ||
          prevSection.nodes.length === 1)


        className = cx(className, {
          [styles.postClearSection]: isPreviousSectionClearable
        });

        // anchors like 'h2-h3'
        if (item.type === 'h2') {
          prevSection.className = cx(prevSection.className, {
            [styles.lastSection]: true,
            [styles.clearSection]: isPreviousSectionClearable
          });

          currentID = kebabCase(item.props.children[0]);
          currentParentID = currentID;
        } else if (!!currentParentID) {
          currentID = `${currentParentID}-${kebabCase(item.props.children[0])}`;
        } else {
          currentID = kebabCase(item.props.children[0]);
        }

        sectionTags.push(
          {
            id: currentID,
            type: item.type,
            nodes: [],
            title: item.props.children[0],
            className
          }
        );

        linkedHTag = React.cloneElement(item, { className: styles.hTag },
          React.createElement(ScrollLink, {to: currentID},
            React.createElement(Icon, {
              type: 'link',
              className: styles.hTagIcon
            }
            ),
            item.props.children[0]
          )
        );
      }

      last(sectionTags).nodes.push(linkedHTag || item);
    })

    const nodes = sectionTags.map(item => {
      return React.createElement('section', {
        key: item.id,
        id: item.id,
        type: item.type,
        className: item.className
      }, item.nodes);
    });

    const sections = sectionTags.map(item => ({
      id: item.id,
      title: item.title,
      type: item.type
    }));

    this.props.setScrollSections(sections);
    this.setState({ nodes });
  }

  render() {
    const { markdownRemark = {} } = this.props.data;
    const { frontmatter } = markdownRemark;

    return (
      <div>
        <Helmet
          title={`${frontmatter.title} | Cube.js Docs`}
        />
        <div className={styles.docContainer}>
          <div className={styles.docContent}>
            {this.state.nodes}
          </div>
        </div>
      </div>
    );
  }
};

DocTemplate.propTypes = {
  changePage: PropTypes.func.isRequired,
  setScrollSections: PropTypes.func.isRequired,
  data: PropTypes.object
}

export default DocTemplate;

export const pageQuery = graphql`
  query postByPath($path: String!) {
    markdownRemark(frontmatter: { permalink: { eq: $path } }) {
      html
      frontmatter {
        permalink
        title
        menuTitle
        scope
        category
        frameworkOfChoice
      }
    }
  }
`;
